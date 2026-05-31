export type FeatureStatus = "working" | "partial" | "disabled" | "setup-required";

export interface FeatureDefinition {
  id: string;
  label: string;
  status: FeatureStatus;
  requiredBackendApi?: string;
  requiredPermission?: string;
  description: string;
  setupInstructions?: string;
}

export const featureRegistry: FeatureDefinition[] = [
  {
    id: "chat",
    label: "AI Chat Console",
    status: "working",
    requiredPermission: "aiModel",
    description: "Enables natural language interaction and safe planning loops with AI models."
  },
  {
    id: "voice-voicebox",
    label: "Local Voicebox TTS/STT",
    status: "working",
    requiredBackendApi: "voicebox:status",
    requiredPermission: "microphone",
    description: "Provides local high-quality Whisper transcription and voice synthesis using the Voicebox API.",
    setupInstructions: "Ensure Voicebox is installed from https://voicebox.sh and running on port 17493."
  },
  {
    id: "voice-fallback",
    label: "Browser Voice Fallback",
    status: "working",
    requiredPermission: "microphone",
    description: "SpeechSynthesis and Web Speech recognition fallbacks built directly into the browser."
  },
  {
    id: "files",
    label: "File Intelligence & Parsing",
    status: "working",
    requiredPermission: "files",
    requiredBackendApi: "files:analyze",
    description: "Extracts text from PDF, DOCX, and code files to summarize and explain them."
  },
  {
    id: "memory",
    label: "Local Memory Vault",
    status: "working",
    requiredPermission: "memoryRead",
    requiredBackendApi: "memory:list",
    description: "Loads and queries the local knowledge memory stored inside the data vault."
  },
  {
    id: "notes",
    label: "Markdown Note Manager",
    status: "working",
    requiredPermission: "memoryRead",
    requiredBackendApi: "notes:list",
    description: "Creates, updates, and archives Markdown notes inside the primary memory vault."
  },
  {
    id: "projects",
    label: "Project Scan & Coding Workspace",
    status: "working",
    requiredPermission: "coding",
    requiredBackendApi: "projects:list",
    description: "Scans project folders, package.json scripts, and git status to index codebase layouts."
  },
  {
    id: "gitnexus",
    label: "GitNexus Code Intelligence",
    status: "working",
    requiredPermission: "coding",
    requiredBackendApi: "gitnexus:status",
    description: "AST-based code navigation, MCP queries, and impact blast-radius analysis.",
    setupInstructions: "Run 'npm install -g gitnexus' to enable local AST tree-sitter analysis."
  },
  {
    id: "system",
    label: "System Telemetry Monitor",
    status: "working",
    requiredPermission: "systemInfo",
    requiredBackendApi: "system:get",
    description: "Displays real-time hardware metrics for CPU, RAM, Network, and Power."
  },
  {
    id: "apps",
    label: "Controlled App Launcher",
    status: "working",
    requiredPermission: "appLaunch",
    requiredBackendApi: "apps:list",
    description: "Launches local executables, browser links, and VS Code workspaces securely."
  },
  {
    id: "browser-automation",
    label: "Browser Automation Runner",
    status: "setup-required",
    requiredPermission: "browser",
    description: "Playwright-based browser routines and web tasks.",
    setupInstructions: "Playwright automation integration is coming in a future update."
  },
  {
    id: "openclaw",
    label: "OpenClaw Control Integration",
    status: "setup-required",
    description: "Manage OpenClaw daemon hooks and onboarding status directly from the interface.",
    setupInstructions: "Run 'npm install -g openclaw@latest' and run onboarding to link the daemon."
  }
];

export function isFeatureAvailable(id: string): boolean {
  const feat = featureRegistry.find((f) => f.id === id);
  return feat ? feat.status === "working" : false;
}
