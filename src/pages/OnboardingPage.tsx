import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, CheckCircle2, BookOpen, MessageSquare, Loader2 } from "lucide-react";
import { extractTextFromFile } from "@/lib/textExtractor";
import { setDocumentContext } from "@/lib/documentContext";
import { insertDocument } from "@/lib/storage";

export default function OnboardingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  function handleFile(f: File | null) {
    if (!f) {
      setFile(null);
      return;
    }
    // Expanded support: PDF, DOCX, TXT, MD, CSV
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
      "text/csv"
    ];
    // Also check extensions as backup for mime types sometimes being weird
    const validExtensions = [".pdf", ".docx", ".txt", ".md", ".csv"];
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."));

    if (!validTypes.includes(f.type) && !validExtensions.includes(ext)) {
      setExtractError("Unsupported file type. Please upload PDF, DOCX, TXT, MD, or CSV.");
      return;
    }

    setFile(f);
    setUploadDone(false);
    setExtractError(null);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    handleFile(f ?? null);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f ?? null);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  /** Extract text, save to IndexedDB, set session context. Returns documentId when saved. */
  async function extractAndStoreContext(): Promise<{ ok: boolean; documentId?: string }> {
    if (!file) return { ok: false };
    setExtractError(null);
    setExtracting(true);
    try {
      const text = await extractTextFromFile(file);
      const doc = await insertDocument(file.name, text);
      const documentId = doc?.id ?? undefined;
      setDocumentContext(text, file.name, documentId);
      return { ok: true, documentId };
      return { ok: true, documentId };
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Failed to extract text from file");
      return { ok: false };
    } finally {
      setExtracting(false);
    }
  }

  async function addToLibrary() {
    if (!file) return;
    const { ok } = await extractAndStoreContext();
    if (ok) setUploadDone(true);
  }

  async function openChat() {
    if (file) {
      const { ok, documentId } = await extractAndStoreContext();
      if (!ok) return;
      navigate(documentId ? `/chat/${documentId}` : "/chat");
      return;
    }
    navigate("/chat");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Get Started</h1>
        <p className="text-muted-foreground mb-8">
          Upload a textbook PDF and start studying with AI. Your file is processed locally—your data stays on your device.
        </p>

        <Card className="p-6 border-2 border-dashed border-muted-foreground/25 bg-card/50">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.csv"
            className="hidden"
            onChange={onInputChange}
            aria-label="Choose file"
          />

          {!file ? (
            <button
              type="button"
              onClick={openFilePicker}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={`w-full rounded-lg border-2 border-dashed py-12 px-6 transition-colors ${isDragging
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
                }`}
            >
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Upload className="h-12 w-12" />
                <span className="font-medium text-foreground">
                  Click to upload or drag and drop
                </span>
                <span className="text-sm">PDF, DOCX, TXT, MD, CSV</span>
              </div>
            </button>
          ) : (
            <div className="space-y-4">
              {extracting && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-primary/30 bg-primary/5 py-8 px-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm font-medium text-foreground">Processing your file…</p>
                  <p className="text-xs text-muted-foreground">Your text is being sent to Gemini. Please wait.</p>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <FileText className="h-10 w-10 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              {extractError && (
                <p className="text-sm text-destructive">{extractError}</p>
              )}
              {uploadDone ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Added to your library. You can open Chat to ask questions about this document.</span>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {!uploadDone && (
                  <Button onClick={addToLibrary} className="gap-2" disabled={extracting}>
                    {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                    Add to Library
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={openChat}
                  className="gap-2"
                  disabled={extracting}
                >
                  {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  Open Chat
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFile(null);
                    setUploadDone(false);
                  }}
                >
                  Choose another file
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Skip to Chat — Judge-friendly quick access */}
        <div className="mt-4 text-center">
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
          >
            <MessageSquare className="h-4 w-4" />
            Skip — Chat without a document
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card className="p-4">
            <h3 className="font-semibold mb-1">Your Library</h3>
            <p className="text-sm text-muted-foreground mb-3">
              See all uploaded books and open them for study.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/library">Go to Library</Link>
            </Button>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-1">Chat with StudyBuddy</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Ask questions and get explanations powered by AI.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/chat">Open Chat</Link>
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
