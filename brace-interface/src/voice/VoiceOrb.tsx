import { motion, useReducedMotion } from "framer-motion";
import { Mic, VolumeX } from "lucide-react";
import type { CSSProperties } from "react";
import type { VoiceOrbState } from "../types";

type VoiceOrbProps = {
  state: VoiceOrbState;
  volumeLevel: number;
  isConnected: boolean;
  isVoiceEnabled: boolean;
  onClick: () => void;
  size?: "md" | "lg";
};

const stateTone: Record<VoiceOrbState, string> = {
  idle: "rgba(103,232,249,0.62)",
  listening: "rgba(94,234,212,0.9)",
  thinking: "rgba(167,139,250,0.82)",
  speaking: "rgba(56,189,248,0.9)",
  error: "rgba(251,113,133,0.9)",
  muted: "rgba(100,116,139,0.55)",
  offline: "rgba(71,85,105,0.5)",
};

export function VoiceOrb({ isConnected, isVoiceEnabled, onClick, size = "lg", state, volumeLevel }: VoiceOrbProps) {
  const reducedMotion = useReducedMotion();
  const dimension = size === "lg" ? "h-72 w-72 md:h-96 md:w-96" : "h-56 w-56";
  const tone = stateTone[!isConnected ? "offline" : !isVoiceEnabled ? "muted" : state];
  const scale = 1 + Math.min(0.12, volumeLevel * 0.12);

  return (
    <button
      aria-label="Toggle B.R.A.C.E voice"
      className={`voice-orb group relative ${dimension} rounded-full border border-cyan-200/20 bg-black/20 outline-none`}
      onClick={onClick}
      style={{ "--voice-tone": tone, "--voice-scale": scale } as CSSProperties & Record<string, string | number>}
      type="button"
    >
      <motion.span
        animate={reducedMotion ? {} : { scale: state === "listening" ? [1, scale, 1] : [1, 1.025, 1], opacity: [0.34, 0.72, 0.34] }}
        className="absolute inset-0 rounded-full border border-[color:var(--voice-tone)]/60 bg-[color:var(--voice-tone)]/10 blur-[1px]"
        transition={{ duration: state === "listening" ? 0.9 : 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        animate={reducedMotion ? {} : { rotate: state === "thinking" ? 360 : 120 }}
        className="absolute inset-6 rounded-[44%_56%_52%_48%] border border-white/10 bg-cyan-200/[0.025]"
        transition={{ duration: state === "thinking" ? 3 : 18, repeat: Infinity, ease: "linear" }}
      />
      <motion.span
        animate={reducedMotion ? {} : { rotate: state === "speaking" ? -360 : -90, scale: state === "speaking" ? [1, 1.06, 1] : [1, 1.015, 1] }}
        className="absolute inset-12 rounded-[58%_42%_47%_53%] border border-cyan-100/15 bg-white/[0.035]"
        transition={{ duration: state === "speaking" ? 2.2 : 12, repeat: Infinity, ease: "linear" }}
      />
      <span className="absolute inset-[28%] rounded-full bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.92),var(--voice-tone)_30%,rgba(8,13,24,0.22)_72%)] shadow-[0_0_110px_var(--voice-tone)]" />
      {state === "listening" && (
        <>
          <span className="voice-ring voice-ring-a" />
          <span className="voice-ring voice-ring-b" />
        </>
      )}
      {state === "speaking" && (
        <span className="absolute inset-x-16 bottom-20 flex items-end justify-center gap-1.5">
          {Array.from({ length: 18 }, (_, index) => (
            <motion.span
              animate={reducedMotion ? {} : { height: [8, 28 + ((index * 7) % 24), 10] }}
              className="w-1 rounded-full bg-cyan-100/80"
              key={index}
              transition={{ duration: 0.75, delay: index * 0.025, repeat: Infinity }}
            />
          ))}
        </span>
      )}
      <span className="absolute inset-0 flex items-center justify-center text-cyan-50">
        {!isVoiceEnabled ? <VolumeX size={34} /> : <Mic size={34} />}
      </span>
    </button>
  );
}
