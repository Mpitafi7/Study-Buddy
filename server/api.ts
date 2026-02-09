/**
 * Server-side API handlers.
 * BYOK: API key is taken from request header X-Gemini-Api-Key (user's key from Settings) first,
 * then from process.env.GEMINI_API_KEY. If neither is set, we return a clear error so the UI can show "API Key Missing".
 *
 * GEMINI AS CHAT MODEL: All chat streams (POST /api/chat/stream) are exclusively
 * powered by the Google Gemini API via the @google/genai SDK.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";

function loadEnvFallback(): void {
  if (process.env.GEMINI_API_KEY) return;
  try {
    const path = join(process.cwd(), ".env");
    if (!existsSync(path)) return;
    const content = readFileSync(path, "utf8");
    for (const line of content.split("\n")) {
      const match = /^GEMINI_API_KEY\s*=\s*(.+)$/.exec(line.trim());
      if (match) {
        process.env.GEMINI_API_KEY = match[1].replace(/^["']|["']$/g, "").trim();
        break;
      }
    }
  } catch {
    // ignore
  }
}

const GEMINI_API_KEY_HEADER = "x-gemini-api-key";

function getApiKeyFromEnv(): string | undefined {
  loadEnvFallback();
  const raw = process.env.GEMINI_API_KEY;
  return raw ? raw.trim() : undefined;
}

/** Prefer key from request header (BYOK), then env. */
function getApiKey(req: import("http").IncomingMessage): string | undefined {
  const header = req.headers[GEMINI_API_KEY_HEADER];
  const fromHeader = typeof header === "string" ? header.trim() : Array.isArray(header) ? header[0]?.trim() : undefined;
  if (fromHeader) return fromHeader;
  return getApiKeyFromEnv();
}

function readJsonBody(req: import("http").IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf8");
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export async function handleVerify(
  req: import("http").IncomingMessage,
  res: import("http").ServerResponse
): Promise<void> {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "API key missing. Add one in Settings or set GEMINI_API_KEY on the server." }));
    return;
  }
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: "Reply with exactly: OK",
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const is429 = message.includes("429") || message.includes("quota") || message.includes("RESOURCE_EXHAUSTED");
    const is404 = message.includes("404") || message.includes("not found") || message.includes("NOT_FOUND");
    const is503 = message.includes("503") || message.includes("overloaded") || message.includes("UNAVAILABLE");
    const userMessage = is429
      ? "Gemini quota exceeded. Try again in a minute or check your plan: https://ai.google.dev/gemini-api/docs/rate-limits"
      : is404
        ? `Model not available. Set GEMINI_MODEL in .env (e.g. gemini-2.0-flash or gemini-2.5-flash-lite). Error: ${message.slice(0, 200)}`
        : is503
          ? "Gemini is overloaded. Please try again in a minute."
          : message;
    res.writeHead(is429 ? 429 : is404 ? 404 : is503 ? 503 : 502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: userMessage }));
  }
}

export async function handleChatStream(
  req: import("http").IncomingMessage,
  res: import("http").ServerResponse
): Promise<void> {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "API key missing. Add one in Settings or set GEMINI_API_KEY on the server." }));
    return;
  }
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  let body: { history?: { role: string; content: string }[]; message?: string; documentContext?: string };
  try {
    body = (await readJsonBody(req)) as typeof body;
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON body" }));
    return;
  }
  const history = Array.isArray(body.history) ? body.history : [];
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const documentContext = typeof body.documentContext === "string" ? body.documentContext.trim() : "";
  if (!message) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "message is required" }));
    return;
  }
  const masterInstruction = `You are StudyBuddy AI, an elite, multi-disciplinary tutor. Your goal is to provide a world-class educational experience using the following strict protocols:

**Mathematical Accuracy:**
- Always use LaTeX for math expressions.
- Use single dollar signs $expression$ for inline math.
- Use double dollar signs $$expression$$ for standalone block equations.
- Break down solutions into: 'Given', 'Formula', 'Step-by-Step Calculation', and 'Final Result'.

**3D-Style Visualizations:**
- You MUST generate a Mermaid.js diagram for every complex explanation.
- Whenever explaining a concept with multiple parts, prefer using the Mermaid mindmap syntax instead of a simple flowchart. Use different shapes and colors in the diagram to distinguish between main topics and sub-topics.
- To give a 3D/depth feel, use Mermaid subgraphs, nested clusters, and diverse node shapes (e.g., cylinders for databases, rounded edges for processes).
- Prefer graph TD (Top-Down) or graph LR (Left-Right) with clear hierarchical structures.

**Technical Diagrams (when the user asks for a diagram of a topic):**
- Generate a high-definition, labeled technical diagram. All labels MUST be in English. The diagram will be shown in the app's diagram panel (background matches the UI).
- Use clear, descriptive node labels and thick connector lines so the diagram stays readable when zoomed in.
- If the topic is complex, break the diagram into exactly 3 separate steps: provide a short heading (e.g. "Step 1: ...", "Step 2: ...", "Step 3: ...") and one Mermaid code block per step, so the user can follow the flow without clutter. For simple topics, a single diagram is fine.

**Voice-First Personality:**
- You are a 'Voice Tutor'. Keep your sentences clear, concise, and easy to pronounce for Text-to-Speech (TTS).
- Use an encouraging and supportive tone. Avoid long, complex paragraphs; use bullet points for readability.

**Spoken summary (for voice/TTS):** Your reply will be read aloud. Do NOT make the system read the whole chat. Instead, at the very start of your reply include exactly this format on one line: VOICE_START: [2–3 short sentences in plain English that (1) state what the user is asking or the problem they have, and (2) give the main takeaway or answer, as if you are talking to them]. VOICE_END. Only this part is read aloud; the rest is for reading on screen. Write the VOICE part in simple, conversational language. After that, write your full detailed answer as usual.

**Document Context:**
- Base your primary answers on the provided documentContext (the uploaded PDF).
- If the user's question isn't in the document, mention it politely and then provide the answer from your general knowledge to stay helpful.

**Output Format:**
- Always embed Mermaid code inside triple backticks with the mermaid tag.
- Use bold headers and clean markdown for a professional UI look.`;

  const systemInstruction = documentContext
    ? `${masterInstruction}

--- Document content (documentContext). Base your primary answers on this; create diagrams yourself when helpful. ---
${documentContext.slice(0, 900000)}
--- End of document ---`
    : masterInstruction;
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const contentHistory = history.map((m) => ({
      role: m.role as "user" | "model",
      parts: [{ text: m.content }],
    }));
    const chat = ai.chats.create({
      model: GEMINI_MODEL,
      history: contentHistory,
      config: systemInstruction ? { systemInstruction } : undefined,
    });
    const stream = await chat.sendMessageStream({ message });

    res.writeHead(200, {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(JSON.stringify({ text: chunk.text }) + "\n");
      }
    }
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const is429 = msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED");
    const is404 = msg.includes("404") || msg.includes("not found") || msg.includes("NOT_FOUND");
    const is503 = msg.includes("503") || msg.includes("overloaded") || msg.includes("UNAVAILABLE");
    const userMsg = is429
      ? "Gemini quota exceeded. Try again in a minute or check your plan: https://ai.google.dev/gemini-api/docs/rate-limits"
      : is404
        ? "Model not available. Set GEMINI_MODEL in .env (e.g. gemini-2.0-flash or gemini-2.5-flash-lite)."
        : is503
          ? "Gemini is overloaded. Please try again in a minute."
          : msg;
    res.writeHead(is429 ? 429 : is404 ? 404 : is503 ? 503 : 502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: userMsg }));
  }
}
