import type { LucideIcon } from "lucide-react";

export type PageId =
  | "home"
  | "chat"
  | "voice"
  | "agent"
  | "tasks"
  | "files"
  | "memory"
  | "notes"
  | "tools"
  | "projects"
  | "system"
  | "apps"
  | "permissions"
  | "logs"
  | "settings";

export type NavItem = {
  id: PageId;
  label: string;
  icon: LucideIcon;
};

export type ChatMessage = {
  id: number;
  role: "user" | "assistant" | "system";
  text: string;
  source?: "brain" | "gemini" | "system" | "agent";
  confidence?: number;
};

export type BrainMatch = {
  title: string;
  source: string;
  answer: string;
  confidence: number;
};

export type PermissionState = {
  label: string;
  description: string;
  riskLevel?: "low" | "medium" | "high" | "blocked";
  enabled: boolean;
  lastUsed: string | null;
};

export type SettingsState = {
  aiProvider: "gemini" | "openai" | "ollama" | "openrouter" | "lmstudio" | "custom";
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  localMode?: boolean;
  geminiKey: string;
  openAiBaseUrl: string;
  openAiApiKey: string;
  openAiModel: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  customEndpoint: string;
  offlineMode: boolean;
  safeMode: boolean;
  voiceRate: number;
  voicePitch: number;
  voiceOutput: boolean;
  wakeWord: boolean;
  themeAccent: string;
  hotkeys: Record<string, string>;
  startup: boolean;
  adminMode: boolean;
  defaultProjectsFolder?: string;
  defaultDownloadsFolder?: string;
  safeFolders?: string[];
  appPaths?: Record<string, string>;
  voice?: VoiceConfig;
};

export type VoiceMode = "best-local" | "fast-local" | "online-high-quality" | "browser-fallback";
export type VoiceOrbState = "idle" | "listening" | "thinking" | "speaking" | "error" | "muted" | "offline";

export type VoiceConfig = {
  mode: VoiceMode;
  sttProvider: string;
  ttsProvider: string;
  vadProvider: string;
  selectedVoice: string;
  language: string;
  speed: number;
  pitch: number;
  volume: number;
  stylePreset: string;
  vadSensitivity: number;
  silenceTimeoutMs: number;
  minSpeechMs: number;
  maxRecordingMs: number;
  interruptionEnabled: boolean;
  wakeWordEnabled: boolean;
  continuousListening: boolean;
  onlineVoiceEnabled: boolean;
  saveRawAudio: boolean;
  saveTranscripts: boolean;
  voiceProvider: string;
  voiceboxBaseUrl: string;
  voiceboxDefaultProfile: string;
};

export type VoiceStatus = {
  ok: boolean;
  mode: string;
  sttProvider: string;
  ttsProvider: string;
  vadProvider: string;
  fallbackActive: boolean;
  dependencies: Record<string, boolean>;
  availableVoices: { id: string; label: string; description: string }[];
  selectedVoice: string;
  voiceboxConnected?: boolean;
  activeProvider?: string;
  setup: string[];
  errors: string[];
};

export type AssistantTask = {
  id: string;
  title: string;
  type: "open-vscode" | "open-folder" | "open-url" | "launch-app" | "focus-timer" | "clean-folder";
  enabled: boolean;
  trusted: boolean;
  detail: string;
  payload: Record<string, string | number | boolean>;
};

export type AppLauncherEntry = {
  id: string;
  name: string;
  path: string;
  trusted: boolean;
  addedAt: string;
};

export type LogEntry = {
  id: string;
  time: string;
  type: string;
  message: string;
  detail?: Record<string, unknown>;
  riskLevel?: string;
  result?: string;
};

export type FileEntry = {
  id: string;
  path: string;
  name: string;
  extension: string;
  size: number;
  modified: string;
};

export type SystemInfo = {
  cpu: number;
  ram: number;
  ramDetail: string;
  storage: number;
  storageDetail: string;
  gpu: number | null;
  gpuDetail: string;
  network: number;
  networkDetail: string;
  battery: number | null;
  batteryDetail: string;
  os: {
    platform: string;
    release: string;
    arch: string;
    hostname: string;
    uptimeSeconds: number;
  };
  updatedAt: string;
};

export type ToolDefinition = {
  name: string;
  description: string;
  riskLevel: string;
  requiredPermission: string;
  supportsDryRun: boolean;
};

export type MemoryRecord = {
  id: string;
  type: "preference" | "project" | "tool" | "routine" | "conversation";
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type NoteEntry = {
  id: string;
  name: string;
  path: string;
  size?: number;
  modified?: string;
  content?: string;
};

export type ProjectInfo = {
  path: string;
  name: string;
  type: string;
  scripts: Record<string, string>;
  git: { isRepo: boolean; status: string };
  entries: { name: string; type: string }[];
};

export type AgentStep = {
  id: string;
  title: string;
  tool: string;
  input: Record<string, unknown>;
  riskLevel: string;
  requiredPermission: string;
  status: string;
};

export type AgentTaskRecord = {
  id: string;
  command: string;
  intent: string;
  goal: string;
  riskLevel: string;
  status: string;
  steps: AgentStep[];
  approvalId?: string;
  outputs?: unknown[];
  error?: string;
  recovery?: string;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalRequest = {
  id: string;
  taskId: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  riskLevel: string;
  plan: AgentTaskRecord;
  createdAt: string;
};

declare global {
  interface Window {
    braceDesktop?: {
      platform: string;
      appMode: string;
      brainPathHint: string;
      state: () => Promise<any>;
      updateSettings: (patch: any) => Promise<any>;
      saveSecret: (payload: { key: string; value: string }) => Promise<any>;
      updatePermission: (payload: { name: string; enabled: boolean }) => Promise<any>;
      listLogs: () => Promise<any[]>;
      clearLogs: () => Promise<any>;
      listChat: () => Promise<any[]>;
      saveChat: (messages: any[]) => Promise<any>;
      clearChat: () => Promise<any>;
      askAi: (payload: { prompt: string }) => Promise<any>;
      testAi: () => Promise<any>;
      systemInfo: () => Promise<any>;
      selectFiles: () => Promise<any>;
      selectFolder: () => Promise<any>;
      analyzeFile: (payload: any) => Promise<any>;
      listTasks: () => Promise<any[]>;
      saveTasks: (tasks: any[]) => Promise<any>;
      runTask: (task: any) => Promise<any>;
      listApps: () => Promise<any[]>;
      addApp: () => Promise<any>;
      deleteApp: (id: string) => Promise<any>;
      launchApp: (app: any) => Promise<any>;
      runAgent: (payload: any) => Promise<any>;
      approveAgent: (payload: any) => Promise<any>;
      rejectAgent: (payload: any) => Promise<any>;
      cancelAgent: (payload: any) => Promise<any>;
      listAgentTasks: () => Promise<any>;
      listTools: () => Promise<any[]>;
      dryRunTool: (payload: any) => Promise<any>;
      listMemories: () => Promise<any[]>;
      searchMemories: (payload: any) => Promise<any[]>;
      saveMemory: (payload: any) => Promise<any>;
      updateMemory: (payload: any) => Promise<any>;
      deleteMemory: (payload: any) => Promise<any>;
      listNotes: () => Promise<any[]>;
      searchNotes: (payload: any) => Promise<any[]>;
      createNote: (payload: any) => Promise<any>;
      readNote: (payload: any) => Promise<any>;
      updateNote: (payload: any) => Promise<any>;
      deleteNote: (payload: any) => Promise<any>;
      listProjects: () => Promise<any[]>;
      addProject: (payload: any) => Promise<any>;
      scanProject: (payload: any) => Promise<any>;
      voiceStatus: () => Promise<any>;
      getVoiceConfig: () => Promise<any>;
      updateVoiceConfig: (payload: any) => Promise<any>;
      listVoiceOptions: () => Promise<any>;
      logVoiceEvent: (payload: any) => Promise<any>;
      clearAllData: () => Promise<any>;
      onHotkey: (callback: (name: string) => void) => () => void;
      onAgentEvent: (callback: (payload: any) => void) => () => void;
      onApprovalRequest: (callback: (payload: any) => void) => () => void;

      // Voicebox
      voiceboxStatus: () => Promise<any>;
      voiceboxProfiles: () => Promise<any>;
      voiceboxSpeak: (payload: { text: string; options?: any }) => Promise<any>;
      voiceboxTranscribe: (payload: { audioBuffer: ArrayBuffer; options?: any }) => Promise<any>;
      voiceboxTest: (payload?: any) => Promise<any>;
      voiceboxStop: () => Promise<any>;

      // GitNexus
      gitnexusStatus: (payload: { projectPath?: string }) => Promise<any>;
      gitnexusIndex: (payload: { projectPath?: string; mode?: "analyze" | "reindex" }) => Promise<any>;
      gitnexusDocs: (payload: { projectPath?: string }) => Promise<any>;
      gitnexusOpenDoc: (payload: { filePath: string }) => Promise<any>;
    };
  }
}

