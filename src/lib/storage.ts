/**
 * Local IndexedDB persistence using idb.
 * Replaces the previous Guest-mode Supabase persistence.
 */

import { getDB } from "@/lib/db";

export const GUEST_USER_ID = "local-user"; // Legacy constant, kept for compatibility if needed

export type DocumentRow = {
  id: string;
  user_id: string; // Kept for compatibility
  name: string;
  extracted_text: string;
  created_at: string;
};

export type ChatRow = {
  id: string;
  user_id: string; // Kept for compatibility
  document_id: string | null;
  role: "user" | "model"; // Fixed type to match DB
  content: string;
  created_at: string;
};

/** Insert a document. Returns the new row (with id). */
export async function insertDocument(name: string, extracted_text: string): Promise<DocumentRow | null> {
  try {
    const db = await getDB();
    const newDoc = {
      id: crypto.randomUUID(),
      name,
      extracted_text,
      created_at: new Date().toISOString(),
    };
    await db.put("documents", newDoc);
    const doc = { ...newDoc, user_id: GUEST_USER_ID };
    broadcastEvent("document-added", doc);
    return doc;
  } catch (error) {
    console.error("insertDocument:", error);
    return null;
  }
}

/** Fetch all documents, newest first. */
export async function getDocuments(): Promise<DocumentRow[]> {
  try {
    const db = await getDB();
    const docs = await db.getAllFromIndex("documents", "by-date");
    return docs.reverse().map(d => ({ ...d, user_id: GUEST_USER_ID })); // Newest first
  } catch (error) {
    console.error("getDocuments:", error);
    return [];
  }
}

/** Fetch a single document by id. */
export async function getDocumentById(id: string): Promise<DocumentRow | null> {
  try {
    const db = await getDB();
    const doc = await db.get("documents", id);
    return doc ? { ...doc, user_id: GUEST_USER_ID } : null;
  } catch (error) {
    console.error("getDocumentById:", error);
    return null;
  }
}

/** Insert a chat message. document_id may be null for general chat. */
export async function insertChat(
  document_id: string | null,
  role: "user" | "model",
  content: string
): Promise<ChatRow | null> {
  try {
    const db = await getDB();
    const newChat = {
      id: crypto.randomUUID(),
      document_id,
      role,
      content,
      created_at: new Date().toISOString(),
    };
    await db.put("chats", newChat);
    const chat = { ...newChat, user_id: GUEST_USER_ID };
    broadcastEvent("chat-updated", chat);
    return chat;
  } catch (error) {
    console.error("insertChat:", error);
    return null;
  }
}

/** Fetch all chat messages for a document (or general chat when document_id is null), ordered by created_at. */
export async function getChatsByDocument(document_id: string | null): Promise<ChatRow[]> {
  try {
    const db = await getDB();
    const chats = await db.getAll("chats");
    const filtered = chats.filter(c => c.document_id === document_id);
    filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return filtered.map(c => ({ ...c, user_id: GUEST_USER_ID }));
  } catch (error) {
    console.error("getChatsByDocument:", error);
    return [];
  }
}

export type QuizResult = {
  id: string;
  document_id: string;
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    userAnswer?: number;
  }>;
  score: number;
  created_at: string;
};

/** Save a quiz result. */
export async function saveQuizResult(
  document_id: string,
  score: number,
  questions: QuizResult["questions"]
): Promise<QuizResult | null> {
  try {
    const db = await getDB();
    const result: QuizResult = {
      id: crypto.randomUUID(),
      document_id,
      score,
      questions,
      created_at: new Date().toISOString(),
    };
    await db.put("quizzes", result);
    broadcastEvent("quiz-saved", result);
    return result;
  } catch (error) {
    console.error("saveQuizResult:", error);
    return null;
  }
}

/** Get all quiz results, newest first. */
export async function getQuizResults(): Promise<QuizResult[]> {
  try {
    const db = await getDB();
    const results = await db.getAll("quizzes");
    // Ensure all results match the type (migration might be needed in production, but here we assume fresh or compatible)
    return (results as QuizResult[]).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error("getQuizResults:", error);
    return [];
  }
}

// --- Real-time Events ---

export type AppEvent =
  | { type: "document-added"; payload: DocumentRow }
  | { type: "chat-updated"; payload: ChatRow }
  | { type: "quiz-saved"; payload: QuizResult };

const CHANNEL_NAME = "studybuddy-events";

function broadcastEvent<T extends AppEvent>(type: T["type"], payload: T["payload"]) {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage({ type, payload });
  channel.close();
}

export function subscribeToEvents(callback: (event: AppEvent) => void): () => void {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (msg) => {
    if (msg.data && msg.data.type) {
      callback(msg.data as AppEvent);
    }
  };
  return () => channel.close();
}
