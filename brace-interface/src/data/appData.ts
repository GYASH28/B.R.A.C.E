import {
  Bot,
  BrainCircuit,
  Cpu,
  Database,
  FileText,
  Gauge,
  Home,
  KeyRound,
  ListFilter,
  MemoryStick,
  Mic,
  NotebookText,
  PackageSearch,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UploadCloud,
  Wifi,
  Workflow,
  Zap,
} from "lucide-react";
import type { NavItem } from "../types";

export const navItems: NavItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "chat", label: "Chat", icon: Bot },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "agent", label: "Agent", icon: Workflow },
  { id: "tasks", label: "Tasks", icon: Workflow },
  { id: "files", label: "Files", icon: FileText },
  { id: "memory", label: "Memory", icon: MemoryStick },
  { id: "notes", label: "Notes", icon: NotebookText },
  { id: "tools", label: "Tools", icon: PackageSearch },
  { id: "projects", label: "Projects", icon: TerminalSquare },
  { id: "system", label: "System", icon: Gauge },
  { id: "apps", label: "Apps", icon: Rocket },
  { id: "permissions", label: "Access", icon: KeyRound },
  { id: "logs", label: "Logs", icon: ListFilter },
  { id: "settings", label: "Settings", icon: Settings },
];

export const quickActions = [
  {
    label: "Start Voice Command",
    detail: "Wake B.R.A.C.E and listen",
    page: "voice",
    icon: Mic,
  },
  {
    label: "Open AI Chat",
    detail: "Brain-first assistant mode",
    page: "chat",
    icon: BrainCircuit,
  },
  {
    label: "Analyze Files",
    detail: "Summarize local documents",
    page: "files",
    icon: UploadCloud,
  },
  {
    label: "Run Local Task",
    detail: "Safe local automation",
    page: "tasks",
    icon: TerminalSquare,
  },
  {
    label: "System Monitor",
    detail: "Local status overview",
    page: "system",
    icon: Cpu,
  },
  {
    label: "Create Automation",
    detail: "Schedule a routine",
    page: "tasks",
    icon: Zap,
  },
] as const;

export const systemMetrics = [
  {
    label: "CPU",
    value: 38,
    detail: "Ryzen local compute",
    icon: Cpu,
    tone: "cyan",
    graph: [24, 31, 28, 44, 38, 51, 39, 42],
  },
  {
    label: "RAM",
    value: 62,
    detail: "9.9 GB of 16 GB",
    icon: Database,
    tone: "teal",
    graph: [48, 52, 57, 55, 61, 66, 62, 63],
  },
  {
    label: "Storage",
    value: 71,
    detail: "Obsidian vault indexed",
    icon: FileText,
    tone: "purple",
    graph: [62, 63, 65, 68, 69, 71, 71, 71],
  },
  {
    label: "Network",
    value: 84,
    detail: "WiFi stable",
    icon: Wifi,
    tone: "cyan",
    graph: [60, 72, 67, 76, 82, 88, 84, 85],
  },
  {
    label: "GPU",
    value: 29,
    detail: "Interface acceleration",
    icon: Sparkles,
    tone: "teal",
    graph: [18, 23, 28, 25, 29, 34, 31, 29],
  },
  {
    label: "Power",
    value: 92,
    detail: "Plugged in",
    icon: ShieldCheck,
    tone: "purple",
    graph: [91, 91, 92, 92, 92, 92, 92, 92],
  },
];

export const recentFiles = [
  {
    name: "B.R.A.C.E Master Dashboard.md",
    type: "Obsidian note",
    status: "Brain source",
    size: "7.8 KB",
  },
  {
    name: "CWIT Official Information.md",
    type: "College data",
    status: "Verified",
    size: "3.2 KB",
  },
  {
    name: "2026-05-26 - B.R.A.C.E Daily Intelligence Digest.md",
    type: "Daily digest",
    status: "Auto-created",
    size: "2.1 KB",
  },
  {
    name: "LERNIO Project.md",
    type: "Project note",
    status: "Active",
    size: "4.4 KB",
  },
];

export const scheduledTasks = [
  {
    title: "Daily study reminder",
    time: "07:30",
    enabled: true,
    detail: "Open Study Dashboard and today's tasks",
  },
  {
    title: "Clean temp files",
    time: "Weekly",
    enabled: false,
    detail: "Requires selected folder and confirmation",
  },
  {
    title: "Open VS Code workspace",
    time: "On command",
    enabled: true,
    detail: "Launch project workspace later through Python bridge",
  },
  {
    title: "Start focus mode",
    time: "20:00",
    enabled: true,
    detail: "Mute distractions and open active project",
  },
];

export const promptChips = [
  "Summarize my files",
  "Open system monitor",
  "Create a study plan",
  "Start voice mode",
];
