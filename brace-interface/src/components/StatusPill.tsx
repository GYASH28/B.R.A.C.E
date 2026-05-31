import type { ReactNode } from "react";

type StatusPillProps = {
  label: string;
  tone?: "cyan" | "teal" | "purple" | "muted" | "green" | "warn" | "danger";
  icon?: ReactNode;
  className?: string;
};

const toneStyles: Record<string, string> = {
  cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.12)]",
  teal: "border-teal-300/25 bg-teal-300/10 text-teal-100 shadow-[0_0_12px_rgba(94,234,212,0.12)]",
  purple: "border-violet-300/25 bg-violet-300/10 text-violet-100 shadow-[0_0_12px_rgba(167,139,250,0.12)]",
  green: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.12)]",
  warn: "border-amber-300/25 bg-amber-300/10 text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.12)]",
  danger: "border-rose-300/25 bg-rose-300/10 text-rose-100 shadow-[0_0_12px_rgba(239,68,68,0.12)]",
  muted: "border-white/10 bg-white/5 text-slate-400",
};

export function StatusPill({ label, tone = "muted", icon, className = "" }: StatusPillProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-all duration-300",
        toneStyles[tone] || toneStyles.muted,
        className,
      ].join(" ")}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
export default StatusPill;
