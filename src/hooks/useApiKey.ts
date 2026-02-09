import { useState, useEffect } from "react";
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey, GEMINI_API_KEY_STORAGE_KEY } from "@/lib/apiKeyStorage";

export function useApiKey() {
    const [apiKey, setApiKeyState] = useState<string | null>(getStoredApiKey());

    useEffect(() => {
        // Sync with local storage changes
        const handleStorageChange = () => {
            setApiKeyState(getStoredApiKey());
        };

        // Listen to standard storage events (cross-tab)
        window.addEventListener("storage", handleStorageChange);

        // Listen to custom event (same-tab)
        window.addEventListener("api-key-saved", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("api-key-saved", handleStorageChange);
        };
    }, []);

    const setApiKey = (key: string) => {
        setStoredApiKey(key);
        setApiKeyState(key);
        window.dispatchEvent(new CustomEvent("api-key-saved")); // Trigger update
    };

    const removeApiKey = () => {
        clearStoredApiKey();
        setApiKeyState(null);
        window.dispatchEvent(new CustomEvent("api-key-saved")); // Trigger update
    };

    return { apiKey, setApiKey, removeApiKey };
}
