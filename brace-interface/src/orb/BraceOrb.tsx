import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

export type BraceOrbState =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "planning"
  | "delegating"
  | "working"
  | "speaking"
  | "awaiting_approval"
  | "success"
  | "error"
  | "offline";

type Props = {
  state: BraceOrbState;
  energy?: number;
  onClick?: () => void;
};

const palette: Record<BraceOrbState, [number, number, number]> = {
  idle: [211, 236, 245],
  listening: [123, 242, 230],
  transcribing: [156, 225, 255],
  thinking: [181, 166, 255],
  planning: [166, 190, 255],
  delegating: [160, 204, 255],
  working: [135, 225, 255],
  speaking: [120, 220, 255],
  awaiting_approval: [255, 211, 138],
  success: [143, 239, 195],
  error: [255, 133, 149],
  offline: [103, 116, 132],
};

export function BraceOrb({ state, energy = 0, onClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 1;
    let height = 1;
    let dpr = 1;
    let raf = 0;
    let tick = 0;
    let last = 0;
    let hidden = document.hidden;

    const count = reducedMotion ? 180 : 520;
    const points = Array.from({ length: count }, (_, index) => {
      const y = 1 - ((index + 0.5) / count) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = Math.PI * (3 - Math.sqrt(5)) * index;
      return {
        x: Math.cos(theta) * radius,
        y,
        z: Math.sin(theta) * radius,
        phase: (index * 0.754877666) % 1,
      };
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onVisibility = () => {
      hidden = document.hidden;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    resize();

    const stateSpeed =
      state === "working" || state === "delegating" ? 0.022 :
      state === "thinking" || state === "planning" ? 0.018 :
      state === "speaking" ? 0.017 :
      state === "listening" ? 0.015 :
      0.0075;

    const draw = (time: number) => {
      const fps = hidden ? 8 : state === "idle" || state === "offline" ? 28 : 60;
      if (time - last < 1000 / fps) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = time;
      tick += reducedMotion ? 0.003 : stateSpeed;

      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const base = Math.min(width, height) * 0.245;
      const [r, g, b] = palette[state];
      const activeEnergy = Math.max(0, Math.min(1, energy));
      const breathing = 1 + Math.sin(tick * 2.2) * 0.018;
      const amplitude =
        state === "listening" || state === "speaking"
          ? activeEnergy * 0.08
          : state === "thinking" || state === "delegating" || state === "working"
            ? 0.025
            : 0.008;

      const aura = ctx.createRadialGradient(cx, cy, base * 0.12, cx, cy, base * 2.35);
      aura.addColorStop(0, `rgba(${r},${g},${b},0.18)`);
      aura.addColorStop(0.32, `rgba(${r},${g},${b},0.065)`);
      aura.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, width, height);

      const cosY = Math.cos(tick);
      const sinY = Math.sin(tick);
      const cosX = Math.cos(tick * 0.42);
      const sinX = Math.sin(tick * 0.42);

      for (const point of points) {
        let x = point.x * cosY - point.z * sinY;
        let z = point.x * sinY + point.z * cosY;
        let y = point.y * cosX - z * sinX;
        z = point.y * sinX + z * cosX;

        const wave = Math.sin(tick * 7 + point.phase * 34) * amplitude;
        const collapse =
          state === "thinking" || state === "planning"
            ? 0.96 + Math.sin(tick * 3.2 + point.phase * 7) * 0.02
            : 1;
        const radius = base * breathing * collapse * (1 + wave);
        const perspective = 1.16 + z * 0.2;
        const px = cx + x * radius * perspective;
        const py = cy + y * radius * perspective;
        const depth = (z + 1) / 2;
        const alpha = 0.1 + depth * 0.76;
        const dot = 0.55 + depth * 1.5 + activeEnergy * 0.45;

        ctx.beginPath();
        ctx.arc(px, py, dot, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tick * (state === "delegating" ? 1.8 : 0.7));
      ctx.strokeStyle = `rgba(${r},${g},${b},0.14)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 9]);
      ctx.beginPath();
      ctx.ellipse(0, 0, base * 1.34, base * 0.36, -0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-tick * 0.42);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.09)`;
      ctx.setLineDash([1, 14]);
      ctx.beginPath();
      ctx.ellipse(0, 0, base * 1.58, base * 0.48, 0.31, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.65);
      core.addColorStop(0, `rgba(255,255,255,${state === "offline" ? 0.18 : 0.68})`);
      core.addColorStop(0.12, `rgba(${r},${g},${b},0.35)`);
      core.addColorStop(0.58, `rgba(${r},${g},${b},0.07)`);
      core.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, base * 0.66, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [energy, reducedMotion, state]);

  return (
    <button
      aria-label="B.R.A.C.E orb"
      className="brace-orb"
      onClick={onClick}
      type="button"
    >
      <canvas ref={canvasRef} className="brace-orb-canvas" />
      <span className="brace-orb-core-mark" />
    </button>
  );
}
