import { openDB, DBSchema, IDBPDatabase } from "idb";

interface StudyBuddyDB extends DBSchema {
    documents: {
        key: string;
        value: {
            id: string;
            name: string;
            extracted_text: string;
            created_at: string;
        };
        indexes: { "by-date": string };
    };
    chats: {
        key: string;
        value: {
            id: string;
            document_id: string | null;
            role: "user" | "model";
            content: string;
            created_at: string;
        };
        indexes: { "by-document": string };
    };
    quizzes: {
        key: string;
        value: {
            id: string;
            document_id: string;
            questions: Array<{
                question: string;
                options: string[];
                correctAnswer: number;
                userAnswer?: number;
            }>;
            score?: number;
            created_at: string;
        };
        indexes: { "by-document": string };
    };
}

const DB_NAME = "studybuddy-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<StudyBuddyDB>> | null = null;

export function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<StudyBuddyDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Documents store
                if (!db.objectStoreNames.contains("documents")) {
                    const docStore = db.createObjectStore("documents", { keyPath: "id" });
                    docStore.createIndex("by-date", "created_at");
                }

                // Chats store
                if (!db.objectStoreNames.contains("chats")) {
                    const chatStore = db.createObjectStore("chats", { keyPath: "id" });
                    chatStore.createIndex("by-document", "document_id");
                }

                // Quizzes store
                if (!db.objectStoreNames.contains("quizzes")) {
                    const quizStore = db.createObjectStore("quizzes", { keyPath: "id" });
                    quizStore.createIndex("by-document", "document_id");
                }
            },
        });
    }
    return dbPromise;
}
