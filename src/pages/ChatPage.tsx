import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { streamChatReply, generateQuiz, type QuizQuestion } from "@/lib/gemini";
import { getDocumentContext, setDocumentContext } from "@/lib/documentContext";
import { getChatsByDocument, getDocumentById, insertChat, saveQuizResult } from "@/lib/storage";
import { MessageContent } from "@/components/chat/MessageContent";
import { DiagramPanel } from "@/components/chat/DiagramPanel";
import { QuizPanel } from "@/components/chat/QuizPanel";
import { LiveCaptionsPanel, type LiveCaption } from "@/components/chat/LiveCaptionsPanel";
import { openSettingsModal } from "@/lib/events";
import { parseVoiceBlock, getTextToSpeak } from "@/lib/voiceBlock";
import { Loader2, Send, CheckCircle, XCircle, Mic, MicOff, Volume2, VolumeX, Square, KeyRound, BrainCircuit } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutDashboard } from "lucide-react";

type Message = { id: string; role: "user" | "model"; content: string };

/** Prefer a high-quality en-US voice (e.g. Google, Microsoft, or first en-US) for Gemini-driven TTS. */
function getPreferredVoice(): SpeechSynthesisVoice | null {
  const voices = typeof speechSynthesis !== "undefined" ? speechSynthesis.getVoices() : [];
  const enUs = voices.filter((v) => v.lang.startsWith("en-US"));
  const preferred =
    enUs.find((v) => /google|natural|premium/i.test(v.name)) ??
    enUs.find((v) => /microsoft|zira|samantha|daniel/i.test(v.name)) ??
    enUs[0] ??
    voices.find((v) => v.lang.startsWith("en")) ??
    voices[0];
  return preferred ?? null;
}

function speakWithPreferredVoice(text: string, onEnd: () => void): void {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.pitch = 1;
  const voice = getPreferredVoice();
  if (voice) u.voice = voice;
  u.onend = onEnd;
  u.onerror = onEnd;
  speechSynthesis.speak(u);
}

import { useApiKey } from "@/hooks/useApiKey";

export default function ChatPage() {
  const { textbookId } = useParams<{ textbookId?: string }>();
  const { apiKey } = useApiKey();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listening, setListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activePanel, setActivePanel] = useState<"diagram" | "quiz">("diagram");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizTopic, setQuizTopic] = useState("");
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [liveCaptions, setLiveCaptions] = useState<LiveCaption[]>([]);
  const currentAiCaptionIdRef = useRef<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const documentContext = getDocumentContext();
  const documentId = textbookId ?? documentContext?.documentId ?? null;

  // Load document context when opening by textbookId (e.g. from Library)
  useEffect(() => {
    if (!textbookId) return;
    let cancelled = false;
    getDocumentById(textbookId).then((doc) => {
      if (cancelled || !doc) return;
      setDocumentContext(doc.extracted_text, doc.name, doc.id);
    });
    return () => {
      cancelled = true;
    };
  }, [textbookId]);

  // Load previous chat messages from Supabase for this document (or general chat)
  useEffect(() => {
    setChatsLoaded(false);
    getChatsByDocument(documentId).then((rows) => {
      setMessages(
        rows.map((r) => ({
          id: r.id,
          role: r.role as "user" | "model",
          content: r.content,
        }))
      );
      setChatsLoaded(true);
    });
  }, [documentId]);

  // Load TTS voices (needed on Chrome; getVoices() is empty until voiceschanged)
  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    const load = () => speechSynthesis.getVoices();
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  // Auto-scroll to bottom when messages change (including while Gemini is streaming)
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollIntoView({
      behavior: isLoading ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, isLoading]);

  // Auto-open settings if no key
  useEffect(() => {
    if (!apiKey && !isLoading) {
      // User requested: "Add a 'Key Settings' modal that pops up if no key is found."
      // We rely on manually checking apiKey before actions, but can hint here if needed.
    }
  }, [apiKey]);

  async function handleSubmit(e?: React.FormEvent, fromVoice = false, textOverride?: string) {
    e?.preventDefault();
    const text = (textOverride || input).trim();
    if (!text || isLoading) return;

    if (!apiKey) {
      openSettingsModal();
      setError("Please set your Gemini API Key in Settings to chat.");
      return;
    }

    setInput("");
    setError(null);
    setHighlightedNodeId(null); // Reset highlight

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "model", content: "" },
    ]);
    setIsLoading(true);

    // Add AI caption entry for live mode
    if (isLiveMode) {
      const aiCaptionId = crypto.randomUUID();
      currentAiCaptionIdRef.current = aiCaptionId;
      setLiveCaptions(prev => [...prev, {
        id: aiCaptionId,
        type: "ai",
        text: "",
        timestamp: new Date(),
        isStreaming: true,
      }]);
    }

    try {
      const history: { role: "user" | "model"; content: string }[] = messages.map(
        (m) => ({ role: m.role, content: m.content })
      );

      // Contextual Memory: If voice/live mode, inject previous model response as context
      let contextPrefix = "";
      if (fromVoice || isLiveMode) {
        const lastModelMessage = [...messages].reverse().find(m => m.role === "model");
        if (lastModelMessage) {
          contextPrefix = `CONTEXT FROM PREVIOUS TURN:\nAssistant said: "${lastModelMessage.content.slice(0, 1000)}..."\n\nUser is asking about this context.\n\n`;
        }
      }

      // System instruction is handled by gemini.ts; only add live-mode context if needed
      const conversationWithContext = contextPrefix
        ? [{ role: "user" as const, content: contextPrefix }, ...history]
        : history;

      let fullText = "";
      let displayText = ""; // Text without special tags

      // Model is auto-resolved by gemini.ts — this param is ignored
      const currentModel = "auto";

      for await (const chunk of streamChatReply(apiKey, currentModel, conversationWithContext, text, documentContext?.text)) {
        fullText += chunk;

        const highlightMatch = chunk.match(/\[HIGHLIGHT:\s*(.*?)\]/);
        if (highlightMatch) {
          setHighlightedNodeId(highlightMatch[1].trim());
        }

        displayText = fullText.replace(/\[HIGHLIGHT:.*?\]/g, "");

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: displayText } : msg
          )
        );

        // Update live caption with streamed text
        if (isLiveMode && currentAiCaptionIdRef.current) {
          const captionId = currentAiCaptionIdRef.current;
          setLiveCaptions(prev =>
            prev.map(c =>
              c.id === captionId ? { ...c, text: displayText.slice(-300) } : c
            )
          );
        }
      }

      // Mark AI caption as done streaming
      if (isLiveMode && currentAiCaptionIdRef.current) {
        const captionId = currentAiCaptionIdRef.current;
        setLiveCaptions(prev =>
          prev.map(c =>
            c.id === captionId ? { ...c, isStreaming: false, text: displayText.slice(-300) } : c
          )
        );
        currentAiCaptionIdRef.current = null;
      }

      await insertChat(documentId, "user", text);
      await insertChat(documentId, "model", displayText);

      // Live Loop / Auto-Speak
      if ((autoSpeak || isLiveMode) && displayText) {
        setIsSpeaking(true);
        speakWithPreferredVoice(getTextToSpeak(displayText), () => {
          setIsSpeaking(false);
          // If Live Mode, restart listening after speaking
          if (isLiveMode) {
            setTimeout(() => startListening(), 500);
          }
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: `Error: ${message}` }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Refactored listening logic for re-use
  function startListening() {
    const Win = window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition };
    const SR = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (!SR) return;

    // If already listening, stop the old session first so we can start fresh
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { }
      recognitionRef.current = null;
      setListening(false);
    }

    const rec: any = new SR();
    rec.continuous = false;
    rec.interimResults = isLiveMode; // Enable interim results in live mode for captions
    rec.lang = "en-US";

    // Track caption for this speech session
    let speechCaptionId: string | null = null;
    if (isLiveMode) {
      speechCaptionId = crypto.randomUUID();
      setLiveCaptions(prev => [...prev, {
        id: speechCaptionId!,
        type: "user",
        text: "...",
        timestamp: new Date(),
        isStreaming: true,
      }]);
    }

    rec.onstart = () => setListening(true);

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const lastResult = e.results[e.results.length - 1];
      const t = lastResult[0].transcript;
      const isFinal = lastResult.isFinal;

      // Update live caption with interim/final text
      if (isLiveMode && speechCaptionId) {
        setLiveCaptions(prev =>
          prev.map(c =>
            c.id === speechCaptionId ? { ...c, text: t, isStreaming: !isFinal } : c
          )
        );
      }

      setInput(t);

      // Auto-submit in Live Mode when we get a final result
      if (isFinal && isLiveMode && t.trim()) {
        // Pass text directly to avoid stale React state
        setTimeout(() => {
          handleSubmit(undefined, true, t);
        }, 100);
      }
    };

    rec.onend = () => {
      setListening(false);
    };

    rec.onerror = () => setListening(false);

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch {
      setListening(false);
    }
  }

  async function handleGenerateQuiz() {
    if (!documentContext?.text) return;
    if (!apiKey) {
      openSettingsModal();
      return;
    }
    setQuizDialogOpen(false);
    setQuizLoading(true);
    setActivePanel("quiz");
    setMobileSheetOpen(true); // Open mobile sheet if on mobile

    try {
      const quiz = await generateQuiz(apiKey, documentContext.text, quizTopic);
      if (quiz && Array.isArray(quiz)) {
        setQuizQuestions(quiz);
      } else {
        setError("Failed to generate quiz. Please try again.");
      }
    } catch (e) {
      setError("Error generating quiz.");
    } finally {
      setQuizLoading(false);
      setQuizTopic(""); // Reset topic
    }
  }

  const latestModelContent = [...messages].reverse().find((m) => m.role === "model")?.content ?? null;

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <Navbar />
      <main className="flex-1 flex flex-col lg:flex-row gap-4 px-4 pt-20 pb-6 container mx-auto max-w-6xl min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex items-center gap-3 mb-4 flex-wrap shrink-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Chat with StudyBuddy</h1>

            <div className="ml-auto lg:hidden">
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">View Content</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh]">
                  <div className="h-full pt-6 flex flex-col">
                    {activePanel === "quiz" && quizQuestions.length > 0 ? (
                      <div className="flex-1 overflow-auto">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold">Quiz Mode</h3>
                          <Button variant="ghost" size="sm" onClick={() => { setActivePanel("diagram"); setMobileSheetOpen(false); }}>Close</Button>
                        </div>
                        <QuizPanel
                          questions={quizQuestions}
                          onComplete={async (score) => {
                            if (documentId) {
                              await saveQuizResult(documentId, score, quizQuestions);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex-1 overflow-auto">
                        <DiagramPanel content={latestModelContent} highlightedNodeId={highlightedNodeId} />
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            {apiKey ? (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400" title="API Key set">
                <CheckCircle className="h-4 w-4" /> Ready
              </span>
            ) : (
              <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700" onClick={openSettingsModal}>
                <XCircle className="h-4 w-4" />
                <span>Set API Key</span>
              </Button>
            )}
            <Button
              type="button"
              variant={autoSpeak ? "secondary" : "ghost"}
              size="sm"
              className="gap-1"
              onClick={() => setAutoSpeak((v) => !v)}
              title={autoSpeak ? "Turn off read aloud" : "Turn on read aloud"}
            >
              {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="text-xs hidden sm:inline">{autoSpeak ? "Read aloud on" : "Read aloud off"}</span>
            </Button>
            {isSpeaking && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-1 animate-pulse"
                onClick={() => {
                  speechSynthesis.cancel();
                  setIsSpeaking(false);
                }}
                title="Stop voice"
              >
                <Square className="h-4 w-4" />
                <span className="text-xs">Stop voice</span>
              </Button>
            )}
            <Button
              type="button"
              variant={isLiveMode ? "default" : "outline"}
              size="sm"
              className={`gap-1 ${isLiveMode ? "animate-pulse border-primary" : ""}`}
              onClick={() => {
                const newVal = !isLiveMode;
                setIsLiveMode(newVal);
                if (newVal) {
                  setAutoSpeak(true);
                  setLiveCaptions([]); // Fresh captions for new session
                  startListening();
                } else {
                  speechSynthesis.cancel();
                  setIsSpeaking(false);
                  setLiveCaptions([]); // Clear captions when leaving live mode
                }
              }}
              title={isLiveMode ? "Disable Live Tutor" : "Enable Live Tutor"}
            >
              <Mic className="h-4 w-4" />
              <span className="text-xs">{isLiveMode ? "Live Tutor ON" : "Live Tutor"}</span>
            </Button>
            {documentContext && (
              <Button
                variant={activePanel === "quiz" ? "secondary" : "outline"}
                size="sm"
                className="gap-1 ml-auto"
                onClick={() => setQuizDialogOpen(true)}
                disabled={quizLoading}
              >
                {quizLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                <span className="text-xs sm:inline">Generate Quiz</span>
              </Button>
            )}
          </div>

          {documentContext && (
            <p className="text-xs text-muted-foreground mb-2 shrink-0">
              Using document: <strong>{documentContext.name}</strong>. Answers and diagrams are generated by <strong>Gemini API</strong> from your document.
            </p>
          )}

          <ScrollArea className="flex-1 min-h-0 rounded-lg border bg-muted/30 p-4">
            <div className="space-y-4 pr-2">
              {!chatsLoaded && (
                <p className="text-sm text-muted-foreground text-center py-6">Loading conversation…</p>
              )}
              {chatsLoaded && messages.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  {documentContext
                    ? "Ask anything about your document. You can type or use the mic. StudyBuddy will explain like a tutor, answer follow-up questions, and show diagrams on the right when helpful."
                    : "Ask anything—explain a topic, quiz me, or help with practice. Upload a PDF from Get Started to chat about it."}
                </p>
              )}
              {messages.map((msg) => (
                <Card
                  key={msg.id}
                  className={`p-3 max-w-[85%] ${msg.role === "user"
                    ? "ml-auto bg-primary/15 border-primary/30"
                    : "mr-auto bg-card"
                    }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {msg.role === "user" ? "You" : "StudyBuddy"}
                    </p>
                    {msg.role === "model" && msg.content && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setIsSpeaking(true);
                          speakWithPreferredVoice(getTextToSpeak(msg.content), () => setIsSpeaking(false));
                        }}
                        title="Read aloud"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {msg.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <MessageContent content={(msg.role === "model" ? parseVoiceBlock(msg.content).displayContent : msg.content) || (isLoading ? "…" : "")} />
                  )}
                </Card>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {
            error && (
              <p className="text-destructive text-sm mt-2 shrink-0">{error}</p>
            )
          }

          <form onSubmit={handleSubmit} className="mt-4 flex gap-2 shrink-0">
            <div className="flex-1 flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Type your message…"
                className="min-h-[44px] resize-none"
                rows={1}
                disabled={isLoading}
              />
              {typeof window !== "undefined" && (("SpeechRecognition" in window) || ("webkitSpeechRecognition" in window)) && (
                <Button
                  type="button"
                  variant={listening ? "destructive" : "outline"}
                  size="icon"
                  className={`shrink-0 h-11 w-11 ${listening ? "animate-pulse" : ""}`}
                  disabled={isLoading}
                  onClick={() => {
                    if (listening) {
                      recognitionRef.current?.stop();
                      setListening(false);
                    } else {
                      startListening();
                    }
                  }}
                  title={listening ? "Stop listening" : "Voice input"}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <Button type="submit" size="icon" className="shrink-0 h-11 w-11" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>

        <aside className="hidden lg:flex w-[340px] shrink-0 h-[calc(100vh-8rem)] lg:min-h-0 overflow-hidden flex-col gap-2">
          {activePanel === "quiz" && quizQuestions.length > 0 ? (
            <div className="flex-1 overflow-auto">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Quiz Mode</h3>
                <Button variant="ghost" size="sm" onClick={() => setActivePanel("diagram")}>Close</Button>
              </div>
              <QuizPanel
                questions={quizQuestions}
                onComplete={async (score) => {
                  if (documentId) {
                    await saveQuizResult(documentId, score, quizQuestions);
                  }
                }}
              />
            </div>
          ) : isLiveMode ? (
            /* Live Tutor mode: split sidebar — diagram top, captions bottom */
            <>
              <div className="h-[45%] shrink-0 overflow-hidden">
                <DiagramPanel content={latestModelContent} highlightedNodeId={highlightedNodeId} />
              </div>
              <div className="flex-1 min-h-0">
                <LiveCaptionsPanel
                  captions={liveCaptions}
                  isListening={listening}
                  isSpeaking={isSpeaking}
                />
              </div>
            </>
          ) : (
            <DiagramPanel content={latestModelContent} highlightedNodeId={highlightedNodeId} />
          )}
        </aside>
      </main>

      <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate a Quiz</DialogTitle>
            <DialogDescription>
              Test your knowledge. Leave blank for a general quiz, or type a topic.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="topic" className="text-right">
                Topic
              </Label>
              <Input
                id="topic"
                placeholder="e.g. Newton's Laws"
                className="col-span-3"
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleGenerateQuiz();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleGenerateQuiz} disabled={quizLoading}>
              {quizLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
