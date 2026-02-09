import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey } from "@/lib/apiKeyStorage";
import { verifyApi, clearCachedConfig } from "@/lib/gemini";
import { Loader2, Check, AlertCircle } from "lucide-react";

export type SettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function SettingsModal({ open, onOpenChange, onSaved }: SettingsModalProps) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "validating" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (open) {
      setValue(getStoredApiKey() ?? "");
      setStatus("idle");
      setErrorMessage("");
    }
  }, [open]);

  async function handleSave() {
    if (!value) {
      handleClear();
      return;
    }

    setStatus("validating");
    setErrorMessage("");

    // Clear any cached model config so fresh discovery happens
    clearCachedConfig();

    // verifyApi now auto-discovers working model + endpoint via direct fetch
    const result = await verifyApi(value);

    // Always save the key
    setStoredApiKey(value);

    if (result.ok) {
      setStatus("success");
      setErrorMessage(result.model ? `Using model: ${result.model}` : "");
      setTimeout(() => {
        onSaved?.();
        window.dispatchEvent(new CustomEvent("api-key-saved"));
        onOpenChange(false);
      }, 1200);
    } else {
      setStatus("error");
      setErrorMessage(result.error || "Could not connect to Gemini API. Key saved anyway.");
      // Still dispatch event so app can try
      window.dispatchEvent(new CustomEvent("api-key-saved"));
    }
  }

  function handleClear() {
    clearStoredApiKey();
    clearCachedConfig();
    setValue("");
    setStatus("idle");
    onSaved?.();
    window.dispatchEvent(new CustomEvent("api-key-saved"));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Enter your Gemini API Key. It is stored locally in your browser.
            The app will automatically find the fastest available model.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="gemini-key">Gemini API Key</Label>
            <Input
              id="gemini-key"
              type="password"
              placeholder="AIza..."
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setStatus("idle");
                setErrorMessage("");
              }}
              autoComplete="off"
              className={`font-mono text-sm ${status === "error" ? "border-destructive" : ""}`}
            />
            {status === "error" && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errorMessage}
              </p>
            )}
            {status === "success" && errorMessage && (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="h-3 w-3" /> {errorMessage}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Get a key at{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>
        </div>
        <DialogFooter className="flex-row gap-2 sm:gap-0">
          {value ? (
            <Button type="button" variant="outline" onClick={handleClear} disabled={status === "validating"}>
              Clear
            </Button>
          ) : null}
          <Button type="button" onClick={handleSave} disabled={status === "validating" || status === "success"}>
            {status === "validating" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status === "success" && <Check className="mr-2 h-4 w-4" />}
            {status === "idle" && "Save"}
            {status === "validating" && "Discovering model..."}
            {status === "success" && "Saved"}
            {status === "error" && "Retry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
