import { useState, useEffect } from "react";

export const MODEL_STORAGE_KEY = "studybuddy-model-preference";
export const DEFAULT_MODEL = "gemini-1.5-flash";

export type AIModel = "gemini-1.5-flash" | "gemini-1.5-pro";

export function useModelSettings() {
    const [model, setModelState] = useState<AIModel>(() => {
        return (localStorage.getItem(MODEL_STORAGE_KEY) as AIModel) || DEFAULT_MODEL;
    });

    const setModel = (newModel: AIModel) => {
        localStorage.setItem(MODEL_STORAGE_KEY, newModel);
        setModelState(newModel);
        window.dispatchEvent(new CustomEvent("model-changed", { detail: newModel }));
    };

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === MODEL_STORAGE_KEY) {
                setModelState((e.newValue as AIModel) || DEFAULT_MODEL);
            }
        };

        const handleCustomChange = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail) setModelState(detail);
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("model-changed", handleCustomChange);
        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("model-changed", handleCustomChange);
        };
    }, []);

    return { model, setModel };
}
