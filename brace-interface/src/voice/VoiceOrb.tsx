import { motion, useReducedMotion } from "framer-motion";
import { Mic, VolumeX, AlertCircle } from "lucide-react";
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

// Cyber/Neon styled tone palette mimicking a futuristic AI core
const stateTone: Record<VoiceOrbState, string> = {
  idle: "0, 238, 255", // Bright cyan
  listening: "0, 255, 170", // Neon teal/green
  thinking: "170, 0, 255", // Deep purple/violet
  speaking: "0, 150, 255", // Bright blue
  error: "255, 50, 50", // Crimson red
  muted: "100, 116, 139", // Slate
  offline: "71, 85, 105", // Slate dark
};

export function VoiceOrb({ isConnected, isVoiceEnabled, onClick, size = "lg", state, volumeLevel }: VoiceOrbProps) {
  const reducedMotion = useReducedMotion();
  const dimension = size === "lg" ? "h-64 w-64 md:h-80 md:w-80" : "h-48 w-48";
  
  const actualState = !isConnected ? "offline" : !isVoiceEnabled ? "muted" : state;
  const rgb = stateTone[actualState];
  const isSpeaking = actualState === "speaking";
  const isListening = actualState === "listening";
  const isThinking = actualState === "thinking";
  const isError = actualState === "error" || actualState === "offline";

  // Audio-reactive scale and brightness
  const scale = 1 + Math.min(0.2, volumeLevel * 0.15);
  const brightness = 1 + Math.min(0.5, volumeLevel * 0.4);

  return (
    <div className={`relative flex items-center justify-center ${dimension}`}>
      {/* Background glow behind the entire orb */}
      <motion.div
        animate={reducedMotion ? {} : { 
          scale: isSpeaking ? [1, 1.1 * scale, 1] : isListening ? [1, 1.05, 1] : [1, 1.02, 1],
          opacity: isSpeaking ? [0.4, 0.6 * brightness, 0.4] : [0.3, 0.4, 0.3] 
        }}
        transition={{ duration: isSpeaking ? 0.2 : 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-[-40%] rounded-full blur-[60px]"
        style={{ background: `radial-gradient(circle, rgba(${rgb}, 0.5) 0%, transparent 70%)` }}
      />

      <button
        aria-label="Toggle B.R.A.C.E voice"
        className="group relative h-full w-full outline-none"
        onClick={onClick}
        style={{ "--core-rgb": rgb } as CSSProperties}
        type="button"
      >
        {/* Outer Scanner Ring 1 (Thin, Rotating) */}
        <motion.div
          animate={reducedMotion ? {} : { rotate: 360, scale: isListening ? [1, 1.05, 1] : 1 }}
          transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" }, scale: { duration: 1.5, repeat: Infinity } }}
          className="absolute inset-0 rounded-full border border-[rgba(var(--core-rgb),0.15)] mix-blend-screen"
          style={{ borderTopColor: `rgba(${rgb}, 0.8)`, borderRightColor: `rgba(${rgb}, 0.3)` }}
        />

        {/* Outer Scanner Ring 2 (Dashed, Reverse Rotating) */}
        <motion.div
          animate={reducedMotion ? {} : { rotate: -360 }}
          transition={{ duration: isThinking ? 8 : 30, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4 rounded-full border border-dashed border-[rgba(var(--core-rgb),0.2)] mix-blend-screen"
          style={{ borderBottomColor: `rgba(${rgb}, 0.6)` }}
        />

        {/* Pulsing Ripple Rings (Active during listening/speaking) */}
        {(isListening || isSpeaking) && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-8 rounded-full border-2 border-[rgba(var(--core-rgb),0.4)]"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.5, delay: 0.75, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-8 rounded-full border border-[rgba(var(--core-rgb),0.2)]"
            />
          </>
        )}

        {/* Inner Glass Core Boundary */}
        <div className="absolute inset-8 rounded-full border border-[rgba(var(--core-rgb),0.3)] bg-black/40 backdrop-blur-md shadow-[inset_0_0_40px_rgba(var(--core-rgb),0.2)]" />

        {/* Dynamic Core Energy (Scales with audio) */}
        <motion.div
          animate={reducedMotion ? {} : { scale: isSpeaking ? [0.95, 1.05 * scale, 0.95] : [0.98, 1.02, 0.98] }}
          transition={{ duration: isSpeaking ? 0.1 : 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-12 rounded-full blur-[15px]"
          style={{ background: `radial-gradient(circle, rgba(${rgb}, ${isSpeaking ? 0.8 : 0.4}) 0%, transparent 80%)` }}
        />

        {/* Central Orb Solid Glass */}
        <div 
          className="absolute inset-[28%] rounded-full shadow-[0_0_30px_rgba(var(--core-rgb),0.6)]"
          style={{
            background: `radial-gradient(circle at 35% 25%, rgba(255,255,255,0.9) 0%, rgba(${rgb}, 0.8) 20%, rgba(${rgb}, 0.4) 60%, rgba(0,0,0,0.8) 100%)`,
            boxShadow: `inset 0 -10px 20px rgba(0,0,0,0.5), inset 0 10px 20px rgba(255,255,255,0.4), 0 0 ${20 * brightness}px rgba(${rgb}, 0.5)`
          }}
        />

        {/* Particle/Noise overlay inside core for 'living' effect */}
        {isThinking && (
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[30%] rounded-full opacity-50 mix-blend-overlay"
            style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '8px 8px' }}
          />
        )}

        {/* Center Icon */}
        <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10">
          {isError ? (
            <AlertCircle size={36} className="text-white" strokeWidth={1.5} />
          ) : !isVoiceEnabled ? (
            <VolumeX size={36} className="text-white/80" strokeWidth={1.5} />
          ) : (
            <motion.div
              animate={isListening ? { scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Mic size={36} strokeWidth={isListening ? 2 : 1.5} className="text-white" />
            </motion.div>
          )}
        </span>
      </button>
    </div>
  );
}
