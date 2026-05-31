import { motion } from "framer-motion";
import { Mic, Bot } from "lucide-react";

type TranscriptPanelProps = {
  transcript: string;
  partialTranscript: string;
  lastResponse?: string;
  orbState: string;
};

export function TranscriptPanel({ transcript, partialTranscript, lastResponse, orbState }: TranscriptPanelProps) {
  const activeText = partialTranscript || transcript;

  if (!activeText && !lastResponse) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl w-full mx-auto mt-6 space-y-3"
    >
      {/* Transcript Block */}
      {activeText && (
        <div className="flex gap-3 items-start text-left rounded-2xl border border-cyan-300/15 bg-black/30 p-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200">
            <Mic size={14} className={orbState === "listening" ? "animate-pulse" : ""} />
          </div>
          <div className="text-sm text-slate-300">
            <span className="block text-[10px] uppercase tracking-wider text-cyan-400 font-mono mb-1">Live Transcript</span>
            <p className="leading-relaxed">{activeText}</p>
          </div>
        </div>
      )}

      {/* Last AI Response (Voice Agent Mode) */}
      {lastResponse && !partialTranscript && (
        <div className="flex gap-3 items-start text-left rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-300/10 text-violet-200">
            <Bot size={14} />
          </div>
          <div className="text-sm text-slate-300">
            <span className="block text-[10px] uppercase tracking-wider text-violet-400 font-mono mb-1">Voice Response</span>
            <p className="leading-relaxed">{lastResponse}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
export default TranscriptPanel;
