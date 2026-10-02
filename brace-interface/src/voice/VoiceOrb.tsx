import { motion, useReducedMotion } from "framer-motion";
import { Mic, Radio, VolumeX } from "lucide-react";
import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import type { VoiceOrbState } from "../types";

type VoiceOrbProps = {
  state: VoiceOrbState;
  volumeLevel: number;
  isConnected: boolean;
  isVoiceEnabled: boolean;
  onClick: () => void;
  size?: "md" | "lg";
};

const stateTone: Record<VoiceOrbState, [number, number, number]> = {
  idle: [89, 225, 255],
  listening: [74, 255, 214],
  thinking: [174, 125, 255],
  speaking: [66, 195, 255],
  error: [255, 94, 126],
  muted: [111, 126, 148],
  offline: [68, 82, 104],
};

function ParticleCore({ level, state }: { level: number; state: VoiceOrbState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let frame = 0;
    let animation = 0;
    let width = 1;
    let height = 1;
    let dpr = 1;
    const count = reducedMotion ? 150 : 460;
    const points = Array.from({ length: count }, (_, index) => {
      const phi = Math.acos(1 - (2 * (index + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      return {
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta),
        phase: (index * 0.61803398875) % 1,
      };
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const render = () => {
      frame += state === "thinking" ? 0.022 : state === "speaking" ? 0.017 : 0.009;
      context.clearRect(0, 0, width, height);
      const [r, g, b] = stateTone[state];
      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.255;
      const audioPush = Math.min(0.22, level * 0.22);
      const pulse = 1 + audioPush + Math.sin(frame * 2.4) * (state === "idle" ? 0.018 : 0.028);
      const cosY = Math.cos(frame);
      const sinY = Math.sin(frame);
      const cosX = Math.cos(frame * 0.37);
      const sinX = Math.sin(frame * 0.37);

      for (const point of points) {
        let x = point.x * cosY - point.z * sinY;
        let z = point.x * sinY + point.z * cosY;
        let y = point.y * cosX - z * sinX;
        z = point.y * sinX + z * cosX;

        const noise = state === "thinking"
          ? Math.sin(frame * 5 + point.phase * 28) * 0.055
          : state === "speaking"
            ? Math.sin(frame * 7 + point.phase * 20) * level * 0.12
            : 0;
        const radius = baseRadius * pulse * (1 + noise);
        const perspective = 1.18 + z * 0.16;
        const px = cx + x * radius * perspective;
        const py = cy + y * radius * perspective;
        const depth = (z + 1) / 2;
        const dot = 0.7 + depth * 1.65 + level * 0.8;
        const alpha = 0.16 + depth * 0.72;

        context.beginPath();
        context.arc(px, py, dot, 0, Math.PI * 2);
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        context.fill();
      }

      const glow = context.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 1.8);
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.16 + level * 0.16})`);
      glow.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.07)`);
      glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      animation = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
    };
  }, [level, reducedMotion, state]);

  return <canvas aria-hidden="true" className="absolute inset-0 h-full w-full" ref={canvasRef} />;
}

export function VoiceOrb({ isConnected, isVoiceEnabled, onClick, size = "lg", state, volumeLevel }: VoiceOrbProps) {
  const reducedMotion = useReducedMotion();
  const effectiveState: VoiceOrbState = !isConnected ? "offline" : !isVoiceEnabled ? "muted" : state;
  const [r, g, b] = stateTone[effectiveState];
  const tone = `rgb(${r} ${g} ${b})`;
  const dimension = size === "lg" ? "h-[22rem] w-[22rem] md:h-[30rem] md:w-[30rem]" : "h-64 w-64";
  const energy = Math.min(1, Math.max(0, volumeLevel));

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    event.currentTarget.style.setProperty("--orb-x", x.toFixed(3));
    event.currentTarget.style.setProperty("--orb-y", y.toFixed(3));
  };

  return (
    <motion.button
      aria-label="Toggle B.R.A.C.E voice"
      className={`jarvis-orb relative ${dimension} select-none rounded-full outline-none`}
      onClick={onClick}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty("--orb-x", "0");
        event.currentTarget.style.setProperty("--orb-y", "0");
      }}
      onPointerMove={handlePointerMove}
      style={{
        "--voice-tone": tone,
        "--orb-energy": energy,
        "--orb-x": 0,
        "--orb-y": 0,
      } as CSSProperties & Record<string, string | number>}
      type="button"
      whileTap={reducedMotion ? undefined : { scale: 0.985 }}
    >
      <span className="jarvis-orb-aura absolute inset-[-18%] rounded-full" />
      <span className="jarvis-orb-grid absolute inset-[3%] rounded-full" />
      <ParticleCore level={energy} state={effectiveState} />

      <motion.span
        animate={reducedMotion ? undefined : { rotate: 360 }}
        className="jarvis-ring jarvis-ring-outer absolute inset-[6%] rounded-full"
        transition={{ duration: effectiveState === "thinking" ? 8 : 24, ease: "linear", repeat: Infinity }}
      />
      <motion.span
        animate={reducedMotion ? undefined : { rotate: -360 }}
        className="jarvis-ring jarvis-ring-mid absolute inset-[14%] rounded-full"
        transition={{ duration: effectiveState === "speaking" ? 6 : 17, ease: "linear", repeat: Infinity }}
      />
      <motion.span
        animate={reducedMotion ? undefined : {
          scale: effectiveState === "listening" ? [1, 1.045 + energy * 0.06, 1] : [1, 1.018, 1],
          opacity: [0.62, 1, 0.62],
        }}
        className="jarvis-core absolute inset-[27%] rounded-full"
        transition={{ duration: effectiveState === "listening" ? 0.85 : 2.8, ease: "easeInOut", repeat: Infinity }}
      />

      {["listening", "speaking"].includes(effectiveState) && (
        <>
          <span className="jarvis-sonar jarvis-sonar-a absolute inset-[20%] rounded-full" />
          <span className="jarvis-sonar jarvis-sonar-b absolute inset-[20%] rounded-full" />
        </>
      )}

      <span className="absolute inset-0 flex items-center justify-center">
        <span className="jarvis-glyph flex h-14 w-14 items-center justify-center rounded-full">
          {!isVoiceEnabled
            ? <VolumeX size={22} />
            : effectiveState === "listening"
              ? <Radio size={22} />
              : <Mic size={22} />}
        </span>
      </span>

      <span className="pointer-events-none absolute bottom-[8%] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.34em] text-cyan-100/55">
        {effectiveState === "thinking" ? "delegating" : effectiveState}
      </span>
    </motion.button>
  );
}
