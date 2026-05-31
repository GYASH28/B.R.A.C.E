import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Mic, Volume2, AlertCircle } from "lucide-react";
import type { VoiceOrbState } from "../types";

export type VoiceboxConnectionStatus = "connected" | "offline" | "loading" | "error";

type VoiceStatusPillProps = {
  orbState: VoiceOrbState;
  voiceboxStatus: VoiceboxConnectionStatus;
  activeProvider: string;
};

const statusConfig: Record<
  string,
  { icon: typeof Wifi; label: string; color: string; bgColor: string; glowColor: string }
> = {
  "connected-idle": {
    icon: Wifi,
    label: "Voicebox connected",
    color: "text-emerald-300",
    bgColor: "bg-emerald-500/10 border-emerald-500/25",
    glowColor: "shadow-[0_0_12px_rgba(52,211,153,0.15)]",
  },
  "connected-listening": {
    icon: Mic,
    label: "Listening…",
    color: "text-teal-300",
    bgColor: "bg-teal-500/10 border-teal-500/30",
    glowColor: "shadow-[0_0_16px_rgba(94,234,212,0.2)]",
  },
  "connected-thinking": {
    icon: Wifi,
    label: "Thinking…",
    color: "text-violet-300",
    bgColor: "bg-violet-500/10 border-violet-500/25",
    glowColor: "shadow-[0_0_14px_rgba(167,139,250,0.18)]",
  },
  "connected-speaking": {
    icon: Volume2,
    label: "Speaking…",
    color: "text-cyan-300",
    bgColor: "bg-cyan-500/10 border-cyan-500/30",
    glowColor: "shadow-[0_0_18px_rgba(34,211,238,0.22)]",
  },
  "connected-error": {
    icon: AlertCircle,
    label: "Voice error",
    color: "text-rose-300",
    bgColor: "bg-rose-500/10 border-rose-500/25",
    glowColor: "shadow-[0_0_12px_rgba(251,113,133,0.15)]",
  },
  offline: {
    icon: WifiOff,
    label: "Voicebox offline",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10 border-slate-500/20",
    glowColor: "",
  },
  fallback: {
    icon: Volume2,
    label: "Fallback voice active",
    color: "text-amber-300",
    bgColor: "bg-amber-500/10 border-amber-500/25",
    glowColor: "shadow-[0_0_10px_rgba(251,191,36,0.12)]",
  },
  loading: {
    icon: Wifi,
    label: "Connecting…",
    color: "text-slate-300",
    bgColor: "bg-slate-500/10 border-slate-500/20 animate-pulse",
    glowColor: "",
  },
};

function getStatusKey(orbState: VoiceOrbState, voiceboxStatus: VoiceboxConnectionStatus, activeProvider: string): string {
  if (voiceboxStatus === "loading") return "loading";
  if (voiceboxStatus === "offline" || voiceboxStatus === "error") {
    return activeProvider === "browser-fallback" ? "fallback" : "offline";
  }
  const stateKey = `connected-${orbState}`;
  return statusConfig[stateKey] ? stateKey : "connected-idle";
}

export function VoiceStatusPill({ orbState, voiceboxStatus, activeProvider }: VoiceStatusPillProps) {
  const key = getStatusKey(orbState, voiceboxStatus, activeProvider);
  const config = statusConfig[key] ?? statusConfig["connected-idle"];
  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 6, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-sm ${config.bgColor} ${config.glowColor}`}
      >
        <Icon size={13} className={config.color} />
        <span className={config.color}>{config.label}</span>
        {(key === "connected-listening" || key === "connected-speaking") && (
          <motion.span
            className={`h-1.5 w-1.5 rounded-full ${key === "connected-listening" ? "bg-teal-400" : "bg-cyan-400"}`}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
