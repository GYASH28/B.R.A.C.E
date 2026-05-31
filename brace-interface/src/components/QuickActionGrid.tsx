import { motion } from "framer-motion";
import { Cpu, FolderOpen, TerminalSquare, MemoryStick, NotebookText, ShieldAlert } from "lucide-react";
import type { PageId } from "../types";

type QuickAction = {
  label: string;
  detail: string;
  page?: PageId;
  run?: () => void;
  icon: typeof Cpu;
};

type QuickActionGridProps = {
  onNavigate: (page: PageId) => void;
  onOpenVSCode?: () => void;
};

export function QuickActionGrid({ onNavigate, onOpenVSCode }: QuickActionGridProps) {
  const actions: QuickAction[] = [
    {
      label: "Open VS Code",
      detail: "Launch current workspace",
      run: onOpenVSCode,
      icon: TerminalSquare,
    },
    {
      label: "System Diagnostics",
      detail: "Run health & dependency checks",
      page: "system", // Redirect to system metrics/diagnostics page
      icon: ShieldAlert,
    },
    {
      label: "Code Intelligence",
      detail: "GitNexus AST indexing & docs",
      page: "projects", // We will put GitNexus under the 'projects' or its own tab
      icon: Cpu,
    },
    {
      label: "Local Memory",
      detail: "Search and save local memory",
      page: "memory",
      icon: MemoryStick,
    },
    {
      label: "Notes Manager",
      detail: "Read/write Obsidian notes",
      page: "notes",
      icon: NotebookText,
    },
    {
      label: "Scan Project",
      detail: "Analyze layout and scripts",
      page: "projects",
      icon: FolderOpen,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 max-w-4xl w-full mx-auto mt-6">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <motion.button
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group flex flex-col items-start text-left rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition duration-300 hover:border-cyan-300/30 hover:bg-cyan-300/[0.05]"
            key={action.label}
            onClick={() => (action.run ? action.run() : action.page ? onNavigate(action.page) : undefined)}
            type="button"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.1)]">
              <Icon size={18} />
            </div>
            <div className="text-sm font-semibold text-white group-hover:text-cyan-200">{action.label}</div>
            <div className="mt-1 text-xs text-slate-500">{action.detail}</div>
          </motion.button>
        );
      })}
    </div>
  );
}
export default QuickActionGrid;
