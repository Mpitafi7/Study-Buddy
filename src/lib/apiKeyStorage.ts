/**
 * Bring Your Own Key: Gemini API key stored in localStorage (client-side only).
 * Sent to our server via header; server never stores it.
 */

export const GEMINI_API_KEY_STORAGE_KEY = "studybuddy-gemini-api-key";

export function getStoredApiKey(): string | null {
  try {
    const raw = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
    return raw ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function setStoredApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    }
  } catch {
    // quota or disabled
  }
}

export function clearStoredApiKey(): void {
  try {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function hasStoredApiKey(): boolean {
  return !!getStoredApiKey();
}
