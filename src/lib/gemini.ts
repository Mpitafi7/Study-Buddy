/**
 * gemini.ts — Robust Gemini API layer with direct fetch fallback.
 *
 * Strategy:
 * 1. Use direct fetch() calls to Google's REST API for FULL control over URL.
 * 2. Try both v1beta and v1 endpoints.
 * 3. Auto-discover working models via ListModels API.
 * 4. Cache the working model + endpoint in localStorage.
 * 5. Keep the SDK import as an optional secondary path.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const API_ENDPOINTS = [
  "https://generativelanguage.googleapis.com/v1beta",
  "https://generativelanguage.googleapis.com/v1",
];

const MODEL_CANDIDATES = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash-001",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
  "gemini-1.5-pro-002",
  "gemini-pro",
  "gemini-1.0-pro",
];

const CACHE_KEY_MODEL = "studybuddy-working-model";
const CACHE_KEY_ENDPOINT = "studybuddy-working-endpoint";

export const SYSTEM_INSTRUCTION = `
You are an Adaptive Learning Expert named StudyBuddy.

1. TONE MATCHING: Analyze the complexity of the user's question and the 'documentContext'.
   - If it's simple (e.g. primary school), use simple words, fun analogies, and short sentences.
   - If it's complex (e.g. PhD/Academic), use technical terminology, deep analysis, and formal tone.

2. VISUAL AID — DETAILED DIAGRAMS (MANDATORY):
   Generate a detailed Mermaid diagram for every explanation.
   Enclose all Mermaid code in \`\`\`mermaid ... \`\`\` blocks.

   STRICT SYNTAX RULES — FOLLOW EXACTLY:
   - Start with: graph TD
   - ONLY use these node shapes (nothing else):
     A["Rectangle label"]  for steps
     B{"Diamond label"}    for decisions
     C["Another step"]     for everything else
   - ALWAYS quote ALL labels: A["My Label"] — never unquoted
   - NEVER use (), (()), {{}}, ([]), [()], [//] shapes — they cause errors
   - ARROWS — only use these:
     A --> B              plain arrow
     A ==> B              thick arrow
     A -.-> B             dotted arrow
     A -- "label" --> B   labeled arrow
   - NEVER chain labels: WRONG: A -- "x" -- y --> B. RIGHT: A -- "x, y" --> B
   - Each arrow gets ONLY ONE label
   - For decisions, use separate arrows from the diamond:
     C{"Is it correct?"} -- "Yes" --> D["Next Step"]
     C -- "No" --> E["Try Again"]

   STRUCTURAL RULES:
   - Use subgraph "Title" ... end to group related concepts (minimum 2 subgraphs)
   - Create MULTI-PATH flows with decision diamonds, not just A-->B-->C
   - Minimum 8 nodes for any topic
   - Keep labels SHORT — max 5-6 words per label

   EXAMPLE (follow this pattern EXACTLY):
   \`\`\`mermaid
   graph TD
      subgraph "Input"
         A["Start"] --> B["Prepare System"]
      end
      subgraph "Process"
         B ==> C{"Type of Energy?"}
         C -- "Kinetic" --> D["Motion"]
         C -- "Thermal" --> E["Heat"]
         C -- "Electrical" --> F["Current"]
      end
      subgraph "Output"
         D --> G["Work Done"]
         E -.-> H["Energy Lost"]
         F ==> I["Powers Device"]
         G --> J["End"]
         H -.-> J
         I --> J
      end
   \`\`\`

3. CONTEXTUAL ACCURACY:
   - Base your answers on the 'documentContext' provided.
   - Never hallucinate.
   - If a concept is NOT in the document but is relevant, use your internal knowledge but EXPLICITLY CITE that it is "additional info not in the document".

4. FORMATTING: Use Markdown. Bold key terms. Use bullet points for readability.

5. LIVE TUTOR MODE:
   - If the user asks about a specific line or step, explain it deeply.
   - **Diagram Interaction:** Output \`[HIGHLIGHT: NodeID]\` to make diagram nodes glow when explaining them.
   - **3D Logic:** For 3D requests, use subgraphs to simulate depth and describe the structure verbally.
`;

export type ChatMessage = { role: "user" | "model"; content: string };

// ─── Cached Model Resolution ────────────────────────────────────────────────

function getCachedConfig(): { model: string; endpoint: string } | null {
  const model = localStorage.getItem(CACHE_KEY_MODEL);
  const endpoint = localStorage.getItem(CACHE_KEY_ENDPOINT);
  if (model && endpoint) return { model, endpoint };
  return null;
}

function setCachedConfig(model: string, endpoint: string): void {
  localStorage.setItem(CACHE_KEY_MODEL, model);
  localStorage.setItem(CACHE_KEY_ENDPOINT, endpoint);
  // Also write to old key for backward compat
  localStorage.setItem("studybuddy-model-preference", model);
  console.log(`[Gemini] Cached working config: ${endpoint}/models/${model}`);
}

export function clearCachedConfig(): void {
  localStorage.removeItem(CACHE_KEY_MODEL);
  localStorage.removeItem(CACHE_KEY_ENDPOINT);
  localStorage.removeItem("studybuddy-model-preference");
}

// ─── Direct Fetch Helpers ────────────────────────────────────────────────────

/**
 * Makes a direct fetch call to Gemini REST API (non-streaming).
 */
async function directGenerateContent(
  apiKey: string,
  endpoint: string,
  modelName: string,
  contents: any[],
  systemInstruction?: string
): Promise<string> {
  const url = `${endpoint}/models/${modelName}:generateContent?key=${apiKey}`;

  const body: any = { contents };
  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`
    );
  }

  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "[No response from model]"
  );
}

/**
 * Makes a direct fetch call to Gemini REST API (SSE streaming).
 */
async function* directStreamGenerateContent(
  apiKey: string,
  endpoint: string,
  modelName: string,
  contents: any[],
  systemInstruction?: string
): AsyncGenerator<string, void, unknown> {
  const url = `${endpoint}/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const body: any = { contents };
  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`
    );
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No readable stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE: lines starting with "data: "
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (trimmed.startsWith("data: ")) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield text;
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }
}

// ─── Auto-Discovery ─────────────────────────────────────────────────────────

/**
 * Lists available models from Google API and finds the first one that
 * supports generateContent. Tries both v1beta and v1 endpoints.
 */
export async function discoverWorkingModel(
  apiKey: string
): Promise<{ model: string; endpoint: string } | null> {
  for (const endpoint of API_ENDPOINTS) {
    try {
      console.log(`[Gemini] Listing models from ${endpoint}...`);
      const res = await fetch(`${endpoint}/models?key=${apiKey}`);
      const data = await res.json();

      if (data.error) {
        console.warn(`[Gemini] ${endpoint} ListModels error:`, data.error.message);
        continue;
      }

      if (!data.models || data.models.length === 0) {
        console.warn(`[Gemini] ${endpoint} returned 0 models`);
        continue;
      }

      console.log(
        `[Gemini] ${endpoint} found ${data.models.length} models`
      );

      // Find best model from our priority list
      const availableNames = new Set(
        data.models
          .filter((m: any) =>
            m.supportedGenerationMethods?.includes("generateContent")
          )
          .map((m: any) => m.name.replace("models/", ""))
      );

      for (const candidate of MODEL_CANDIDATES) {
        if (availableNames.has(candidate)) {
          // Verify it actually works with a ping
          try {
            await directGenerateContent(apiKey, endpoint, candidate, [
              { role: "user", parts: [{ text: "ping" }] },
            ]);
            console.log(`[Gemini] ✅ Working: ${endpoint}/models/${candidate}`);
            return { model: candidate, endpoint };
          } catch (e: any) {
            console.warn(`[Gemini] ${candidate} listed but ping failed:`, e.message);
          }
        }
      }

      // If none of our candidates matched, try the first available model
      const firstAvailable = Array.from(availableNames)[0] as string;
      if (firstAvailable) {
        try {
          await directGenerateContent(apiKey, endpoint, firstAvailable, [
            { role: "user", parts: [{ text: "ping" }] },
          ]);
          console.log(`[Gemini] ✅ Fallback working: ${endpoint}/models/${firstAvailable}`);
          return { model: firstAvailable, endpoint };
        } catch (e: any) {
          console.warn(`[Gemini] Fallback ${firstAvailable} failed:`, e.message);
        }
      }
    } catch (e: any) {
      console.warn(`[Gemini] ${endpoint} network error:`, e.message);
    }
  }

  return null;
}

/**
 * Gets or discovers the working model config.
 * Uses cache first, falls back to discovery.
 */
async function getWorkingConfig(
  apiKey: string
): Promise<{ model: string; endpoint: string }> {
  // Check cache first
  const cached = getCachedConfig();
  if (cached) {
    // Quick verify cached config still works
    try {
      await directGenerateContent(apiKey, cached.endpoint, cached.model, [
        { role: "user", parts: [{ text: "ping" }] },
      ]);
      return cached;
    } catch {
      console.warn("[Gemini] Cached config no longer works, re-discovering...");
      clearCachedConfig();
    }
  }

  // Discover
  const discovered = await discoverWorkingModel(apiKey);
  if (discovered) {
    setCachedConfig(discovered.model, discovered.endpoint);
    return discovered;
  }

  // Ultimate fallback — just use v1beta + gemini-1.5-flash and hope
  console.error("[Gemini] Could not discover any working model. Using default fallback.");
  return {
    model: "gemini-1.5-flash",
    endpoint: API_ENDPOINTS[0],
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Client-side streaming chat using direct fetch (no SDK dependency).
 */
export async function* streamChatReply(
  apiKey: string,
  _modelName: string, // Ignored — auto-resolved
  history: ChatMessage[],
  newUserMessage: string,
  documentContext?: string
): AsyncGenerator<string, void, unknown> {
  if (!apiKey) throw new Error("API Key is required");

  const config = await getWorkingConfig(apiKey);

  const contents: any[] = [];

  // Add history
  for (const msg of history) {
    contents.push({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  // Add new user message
  const prompt = documentContext
    ? `Document Context:\n${documentContext}\n\nUser Question: ${newUserMessage}`
    : newUserMessage;

  contents.push({
    role: "user",
    parts: [{ text: prompt }],
  });

  yield* directStreamGenerateContent(
    apiKey,
    config.endpoint,
    config.model,
    contents,
    SYSTEM_INSTRUCTION
  );
}

/**
 * Generate a quiz based on the provided text (direct fetch).
 */
export async function generateQuiz(
  apiKey: string,
  text: string,
  topic?: string,
  _modelName?: string
): Promise<QuizQuestion[] | null> {
  if (!apiKey) throw new Error("API Key is required");

  const config = await getWorkingConfig(apiKey);

  const prompt = `
    Based on the following text${topic ? `, specifically focusing on the topic "${topic}"` : ""}, generate a short 5-question multiple-choice quiz.
    Return ONLY a raw JSON array of objects, where each object has:
    - question (string)
    - options (array of 4 strings)
    - correctAnswer (number index 0-3)
    - explanation (string)
    
    Text (excerpt):
    ${text.slice(0, 20000)} ${text.length > 20000 ? "..." : ""}
  `;

  try {
    const responseText = await directGenerateContent(
      apiKey,
      config.endpoint,
      config.model,
      [{ role: "user", parts: [{ text: prompt }] }]
    );

    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as QuizQuestion[];
    }
    return JSON.parse(responseText) as QuizQuestion[];
  } catch (e) {
    console.error("Quiz generation error:", e);
    return null;
  }
}

/**
 * Verifies the API Key by discovering a working model.
 * Returns the working model name on success.
 */
export async function verifyApi(
  apiKey: string
): Promise<{ ok: boolean; error?: string; model?: string }> {
  if (!apiKey) return { ok: false, error: "API Key is missing" };
  try {
    const config = await getWorkingConfig(apiKey);
    return { ok: true, model: config.model };
  } catch (e: any) {
    console.warn("API Verification failed:", e);
    return { ok: false, error: e.message || "Invalid API Key" };
  }
}

/**
 * Discovers available models (kept for SettingsModal Troubleshoot button).
 */
export async function findWorkingModel(
  apiKey: string
): Promise<string | null> {
  const result = await discoverWorkingModel(apiKey);
  if (result) {
    setCachedConfig(result.model, result.endpoint);
    return result.model;
  }
  return null;
}

export type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};
