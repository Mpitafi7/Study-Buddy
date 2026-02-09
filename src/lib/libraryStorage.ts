export const LIBRARY_STORAGE_KEY = "studybuddy-uploaded-pdfs";

export type LibraryBook = { name: string; addedAt: string };

export function getLibraryBooks(): LibraryBook[] {
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
