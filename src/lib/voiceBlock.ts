/**
 * Gemini can wrap a short spoken summary in VOICE_START...VOICE_END.
 * We use that for TTS (explains the user's problem + key answer) instead of reading the full chat.
 */

const VOICE_START = "VOICE_START:";
const VOICE_END = "VOICE_END";

export function parseVoiceBlock(content: string): { displayContent: string; voiceContent: string | null } {
  if (!content || typeof content !== "string") {
    return { displayContent: content || "", voiceContent: null };
  }
  const startIdx = content.indexOf(VOICE_START);
  if (startIdx === -1) {
    return { displayContent: content, voiceContent: null };
  }
  const afterStart = content.slice(startIdx + VOICE_START.length);
  const endIdx = afterStart.indexOf(VOICE_END);
  if (endIdx === -1) {
    return { displayContent: content, voiceContent: null };
  }
  const voiceContent = afterStart.slice(0, endIdx).trim();
  const before = content.slice(0, startIdx).trim();
  const after = afterStart.slice(endIdx + VOICE_END.length).trim();
  const displayContent = [before, after].filter(Boolean).join("\n\n").trim();
  return {
    displayContent: displayContent || content,
    voiceContent: voiceContent || null,
  };
}

/** Get the text to speak: voice summary if present, otherwise full content. */
export function getTextToSpeak(content: string): string {
  const { voiceContent, displayContent } = parseVoiceBlock(content);
  return (voiceContent || displayContent || "").trim() || content;
}
