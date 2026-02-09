const KEY = "studybuddy-document-context";
const NAME_KEY = "studybuddy-document-name";
const ID_KEY = "studybuddy-document-id";

export function setDocumentContext(text: string, name: string, documentId?: string | null): void {
  try {
    sessionStorage.setItem(KEY, text);
    sessionStorage.setItem(NAME_KEY, name);
    if (documentId != null && documentId !== "") {
      sessionStorage.setItem(ID_KEY, documentId);
    } else {
      sessionStorage.removeItem(ID_KEY);
    }
  } catch {
    // ignore quota
  }
}

export function getDocumentContext(): { text: string; name: string; documentId?: string } | null {
  try {
    const text = sessionStorage.getItem(KEY);
    const name = sessionStorage.getItem(NAME_KEY);
    const documentId = sessionStorage.getItem(ID_KEY);
    if (text) {
      return {
        text,
        name: name || "Document",
        ...(documentId ? { documentId } : {}),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearDocumentContext(): void {
  try {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(NAME_KEY);
    sessionStorage.removeItem(ID_KEY);
  } catch {
    // ignore
  }
}
