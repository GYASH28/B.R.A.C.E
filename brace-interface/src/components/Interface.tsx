import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BatteryCharging,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  LockKeyhole,
  Mic,
  Paperclip,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Wifi,
} from "lucide-react";
import type { ElementType, HTMLAttributes, ReactNode } from "react";
import type { ChatMessage, NavItem, PageId, SystemInfo } from "../types";

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
};

type StatusBadgeProps = {
  label: string;
  tone?: "cyan" | "teal" | "purple" | "muted" | "green" | "warn";
  icon?: ReactNode;
};

type SidebarProps = {
  items: NavItem[];
  activePage: PageId;
  collapsed: boolean;
  onNavigate: (page: PageId) => void;
  onToggle: () => void;
};

type TopBarProps = {
  time: string;
  micActive: boolean;
  hasGeminiKey: boolean;
  systemInfo?: SystemInfo | null;
};

type CommandButtonProps = {
  label: string;
  detail?: string;
  icon: ElementType;
  onClick: () => void;
};

type SystemMetricCardProps = {
  label: string;
  value: number;
  detail: string;
  icon: ElementType;
  tone: string;
  graph: number[];
};

type SettingsToggleProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
};

const toneMap: Record<string, string> = {
  cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  teal: "border-teal-300/25 bg-teal-300/10 text-teal-100",
  purple: "border-violet-300/25 bg-violet-300/10 text-violet-100",
  green: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  warn: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  muted: "border-white/10 bg-white/5 text-slate-300",
};

export function GlassCard({ children, className = "", interactive = false, ...props }: GlassCardProps) {
  return (
    <div
      className={[
        "glass-panel rounded-2xl border border-white/10 bg-white/[0.055] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl",
        interactive ? "transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-cyan-300/[0.07]" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatusBadge({ label, tone = "muted", icon }: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
        toneMap[tone],
      ].join(" ")}
    >
      {icon}
      {label}
    </span>
  );
}

export function Sidebar({ items, activePage, collapsed, onNavigate, onToggle }: SidebarProps) {
  return (
    <aside
      className={[
        "relative z-20 hidden shrink-0 border-r border-white/10 bg-black/20 px-3 py-4 backdrop-blur-2xl transition-all duration-300 md:flex md:flex-col",
        collapsed ? "w-[82px]" : "w-[232px]",
      ].join(" ")}
    >
      <div className="mb-8 flex items-center justify-between gap-3 px-2">
        <button
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.045] p-2 text-left"
          type="button"
          onClick={() => onNavigate("home")}
          title="B.R.A.C.E home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.18)]">
            <CircleDot size={18} />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block font-display text-[15px] font-semibold tracking-[0.18em] text-white">
                B.R.A.C.E
              </span>
              <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-500">
                local cognitive engine
              </span>
            </span>
          )}
        </button>
        <button
          aria-label="Toggle sidebar"
          className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:border-cyan-300/30 hover:text-cyan-100"
          type="button"
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-2">
        <nav className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.id === activePage;

            return (
              <button
                key={item.id}
                className={[
                  "group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition duration-300",
                  collapsed ? "justify-center" : "",
                  active
                    ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100 shadow-[0_0_34px_rgba(34,211,238,0.15)]"
                    : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.045] hover:text-slate-100",
                ].join(" ")}
                type="button"
                onClick={() => onNavigate(item.id)}
                title={item.label}
              >
                <Icon size={19} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto pt-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <div className="mb-2 flex items-center gap-2 text-cyan-100">
            <ShieldCheck size={15} />
            {!collapsed && <span className="text-xs font-medium">Brain linked</span>}
          </div>
          {!collapsed && (
            <p className="text-xs leading-5 text-slate-500">
              Obsidian vault is treated as the primary local memory before external AI fallback.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

export function TopBar({ time, micActive, hasGeminiKey, systemInfo }: TopBarProps) {
  return (
    <header className="relative z-10 flex min-h-16 items-center justify-between gap-4 border-b border-white/10 px-4 py-3 backdrop-blur-2xl lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <StatusBadge label="Online" tone="green" icon={<span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />} />
        <StatusBadge label="Running locally" tone="cyan" />
        <StatusBadge label={hasGeminiKey ? "Gemini armed" : "Gemini key needed"} tone={hasGeminiKey ? "purple" : "warn"} />
      </div>

      <div className="hidden items-center gap-2 xl:flex">
        <StatusBadge label={systemInfo ? `CPU ${systemInfo.cpu}%` : "CPU locked"} tone="muted" icon={<Activity size={13} />} />
        <StatusBadge label={systemInfo ? `RAM ${systemInfo.ram}%` : "RAM locked"} tone="muted" />
        <StatusBadge label={systemInfo ? systemInfo.networkDetail : "Network locked"} tone="muted" icon={<Wifi size={13} />} />
        <StatusBadge label={systemInfo?.battery != null ? `${systemInfo.battery}%` : "Power"} tone="muted" icon={<BatteryCharging size={13} />} />
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge label={micActive ? "Mic live" : "Mic idle"} tone={micActive ? "cyan" : "muted"} icon={<Mic size={13} />} />
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-sm text-slate-200">
          {time}
        </span>
      </div>
    </header>
  );
}

export function AIOrb({ listening = false, compact = false }: { listening?: boolean; compact?: boolean }) {
  return (
    <div className={["ai-orb relative mx-auto", compact ? "h-52 w-52" : "h-72 w-72"].join(" ")}>
      <motion.div
        animate={{ rotate: 360 }}
        className="absolute inset-0 rounded-[36%_64%_58%_42%] border border-cyan-300/25 bg-cyan-300/[0.03]"
        transition={{ duration: listening ? 8 : 16, ease: "linear", repeat: Infinity }}
      />
      <motion.div
        animate={{ rotate: -360, scale: listening ? [1, 1.05, 1] : [1, 1.02, 1] }}
        className="absolute inset-7 rounded-[56%_44%_39%_61%] border border-teal-200/20 bg-teal-300/[0.04]"
        transition={{ duration: listening ? 5 : 12, ease: "linear", repeat: Infinity }}
      />
      <div className="absolute inset-14 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.86),rgba(103,232,249,0.72)_18%,rgba(14,165,233,0.26)_42%,rgba(8,13,24,0.12)_72%)] shadow-[0_0_90px_rgba(34,211,238,0.34)]" />
      <motion.div
        animate={{ opacity: listening ? [0.35, 0.95, 0.35] : [0.25, 0.55, 0.25] }}
        className="absolute inset-20 rounded-full bg-white/20 blur-xl"
        transition={{ duration: 2.2, repeat: Infinity }}
      />
      <div className="absolute inset-x-10 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent" />
      <div className="absolute inset-y-10 left-1/2 w-px bg-gradient-to-b from-transparent via-cyan-200/50 to-transparent" />
    </div>
  );
}

export function CommandButton({ label, detail, icon, onClick }: CommandButtonProps) {
  const Icon = icon;

  return (
    <motion.button
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      className="group rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-left transition hover:border-cyan-300/35 hover:bg-cyan-300/[0.065]"
      type="button"
      onClick={onClick}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.12)]">
        <Icon size={20} />
      </div>
      <div className="font-medium text-white">{label}</div>
      {detail && <div className="mt-1 text-sm text-slate-500">{detail}</div>}
    </motion.button>
  );
}

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}
      initial={{ opacity: 0, y: 12 }}
    >
      <div
        className={[
          "max-w-[82%] whitespace-pre-wrap rounded-2xl border px-4 py-3 text-sm leading-6",
          isUser
            ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-50"
            : "border-white/10 bg-black/20 text-slate-200 shadow-[0_18px_50px_rgba(0,0,0,0.22)]",
        ].join(" ")}
      >
        {!isUser && (
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            {message.source === "brain" ? "Local brain response" : message.source === "agent" ? "Agent runtime" : message.source === "gemini" ? "AI provider" : "System gate"}
            {typeof message.confidence === "number" && message.confidence > 0 && (
              <span className="ml-auto text-slate-500">{message.confidence}%</span>
            )}
          </div>
        )}
        {message.text}
      </div>
    </motion.div>
  );
}

export function ChatInput({
  value,
  onChange,
  onAttach,
  onSend,
  onVoice,
}: {
  value: string;
  onChange: (value: string) => void;
  onAttach?: () => void;
  onSend: () => void;
  onVoice: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-2 backdrop-blur-xl">
      <button className="icon-button" type="button" onClick={onAttach} title="Attach file">
        <Paperclip size={18} />
      </button>
      <input
        className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-slate-600"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onSend();
          }
        }}
        placeholder="Ask B.R.A.C.E. The local brain is checked before Gemini fallback."
        value={value}
      />
      <button className="icon-button" type="button" onClick={onVoice} title="Voice command">
        <Mic size={18} />
      </button>
      <button className="send-button" type="button" onClick={onSend} title="Send">
        <Send size={17} />
      </button>
    </div>
  );
}

export function SystemMetricCard({ label, value, detail, icon, tone, graph }: SystemMetricCardProps) {
  const Icon = icon;
  const color = tone === "purple" ? "#a78bfa" : tone === "teal" ? "#5eead4" : "#67e8f9";

  return (
    <GlassCard className="p-5" interactive>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-white">{value}%</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3" style={{ color }}>
          <Icon size={20} />
        </div>
      </div>
      <div className="mb-4 h-2 rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <MiniGraph values={graph} color={color} />
      <p className="mt-4 text-sm text-slate-500">{detail}</p>
    </GlassCard>
  );
}

function MiniGraph({ values, color }: { values: number[]; color: string }) {
  return (
    <div className="flex h-12 items-end gap-1.5">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="flex-1 rounded-t-full bg-white/10"
          style={{
            height: `${Math.max(16, value)}%`,
            background: `linear-gradient(180deg, ${color}, rgba(255,255,255,0.06))`,
          }}
        />
      ))}
    </div>
  );
}

export function SettingsToggle({ label, description, checked, onChange }: SettingsToggleProps) {
  return (
    <button
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-cyan-300/25"
      type="button"
      onClick={onChange}
    >
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
      <span
        className={[
          "relative h-6 w-11 rounded-full border transition",
          checked ? "border-cyan-300/40 bg-cyan-300/30" : "border-white/15 bg-white/5",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-4 w-4 rounded-full bg-white transition",
            checked ? "left-6 shadow-[0_0_18px_rgba(103,232,249,0.45)]" : "left-1",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

export function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-16 items-center justify-center gap-1.5">
      {Array.from({ length: 28 }, (_, index) => (
        <motion.span
          animate={{ height: active ? [10, 38 + (index % 5) * 5, 14] : [12, 18, 12] }}
          className="w-1 rounded-full bg-cyan-200/70"
          key={index}
          transition={{ duration: 1.1, delay: index * 0.025, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

export function ApiKeyField({
  apiKey,
  isSaved,
  onChange,
  onClear,
  onSave,
  saveStatus,
}: {
  apiKey: string;
  isSaved: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
  onSave: () => void;
  saveStatus: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-white" htmlFor="gemini-key">
          <LockKeyhole size={16} />
          Gemini API key
        </label>
        <StatusBadge label={isSaved ? "Saved" : "Not saved"} tone={isSaved ? "green" : "warn"} />
      </div>
      <input
        className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40"
        id="gemini-key"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste your Google AI Studio Gemini API key"
        type="password"
        value={apiKey}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="primary-button" onClick={onSave} type="button">
          <Save size={16} />
          Save key
        </button>
        <button className="secondary-button" onClick={onClear} type="button">
          <Trash2 size={16} />
          Clear
        </button>
      </div>
      <p className={["mt-3 text-xs leading-5", isSaved ? "text-emerald-200" : "text-slate-500"].join(" ")}>
        {saveStatus}
      </p>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Saved locally on this PC. B.R.A.C.E checks the local brain first, then uses Gemini only when no strong brain match is found.
      </p>
    </div>
  );
}

export function PageShell({ children, pageKey }: { children: ReactNode; pageKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.main
        animate={{ opacity: 1, y: 0 }}
        className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6"
        exit={{ opacity: 0, y: 8 }}
        initial={{ opacity: 0, y: 12 }}
        key={pageKey}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}
