import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Bot, Volume2 } from "lucide-react";

export type LiveCaption = {
    id: string;
    type: "user" | "ai";
    text: string;
    timestamp: Date;
    /** Whether this caption is still being updated (streaming) */
    isStreaming?: boolean;
};

export function LiveCaptionsPanel({
    captions,
    isListening,
    isSpeaking,
}: {
    captions: LiveCaption[];
    isListening: boolean;
    isSpeaking: boolean;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when captions change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [captions]);

    return (
        <div className="flex flex-col h-full rounded-xl border border-border/80 shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30 shrink-0">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5" />
                    Live Captions
                </h3>
                <div className="flex items-center gap-2">
                    {isListening && (
                        <span className="flex items-center gap-1 text-[10px] text-red-500 font-medium animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Listening
                        </span>
                    )}
                    {isSpeaking && (
                        <span className="flex items-center gap-1 text-[10px] text-blue-500 font-medium animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Speaking
                        </span>
                    )}
                </div>
            </div>

            {/* Captions area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                {captions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                        Live captions will appear here when you speak and StudyBuddy responds.
                    </p>
                ) : (
                    <AnimatePresence initial={false}>
                        {captions.map((caption) => (
                            <motion.div
                                key={caption.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`flex gap-2 ${caption.type === "user" ? "justify-end" : "justify-start"
                                    }`}
                            >
                                {caption.type === "ai" && (
                                    <div className="shrink-0 mt-0.5">
                                        <Bot className="h-4 w-4 text-primary" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed ${caption.type === "user"
                                            ? "bg-primary/15 text-foreground border border-primary/20"
                                            : "bg-muted/60 text-foreground border border-border/40"
                                        } ${caption.isStreaming ? "border-primary/40" : ""}`}
                                >
                                    <p className="whitespace-pre-wrap break-words">
                                        {caption.text}
                                        {caption.isStreaming && (
                                            <span className="inline-block w-1.5 h-3 bg-primary/60 ml-0.5 animate-pulse rounded-sm" />
                                        )}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground mt-0.5 opacity-60">
                                        {caption.timestamp.toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })}
                                    </p>
                                </div>
                                {caption.type === "user" && (
                                    <div className="shrink-0 mt-0.5">
                                        <Mic className="h-4 w-4 text-red-400" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
                <div ref={scrollRef} />
            </div>
        </div>
    );
}
