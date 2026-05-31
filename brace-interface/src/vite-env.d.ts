/// <reference types="vite/client" />

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}

interface GeminiBridgeResult {
  ok: boolean;
  text?: string;
  error?: string;
  model?: string;
}

type BridgePayload = Record<string, unknown>;

interface Window {
  braceDesktop?: {
    platform: string;
    appMode: "desktop";
    brainPathHint: string;
    state: () => Promise<unknown>;
    updateSettings: (patch: BridgePayload) => Promise<unknown>;
    saveSecret: (payload: { key: string; value: string }) => Promise<unknown>;
    updatePermission: (payload: { name: string; enabled: boolean }) => Promise<unknown>;
    listLogs: () => Promise<unknown>;
    clearLogs: () => Promise<unknown>;
    listChat: () => Promise<unknown>;
    saveChat: (messages: unknown[]) => Promise<unknown>;
    clearChat: () => Promise<unknown>;
    askAi: (payload: { prompt: string }) => Promise<GeminiBridgeResult & { provider?: string }>;
    testAi: () => Promise<unknown>;
    systemInfo: () => Promise<unknown>;
    selectFiles: () => Promise<unknown>;
    selectFolder: () => Promise<unknown>;
    analyzeFile: (payload: BridgePayload) => Promise<unknown>;
    listTasks: () => Promise<unknown>;
    saveTasks: (tasks: unknown[]) => Promise<unknown>;
    runTask: (task: BridgePayload) => Promise<unknown>;
    listApps: () => Promise<unknown>;
    addApp: () => Promise<unknown>;
    deleteApp: (id: string) => Promise<unknown>;
    launchApp: (app: BridgePayload) => Promise<unknown>;
    runAgent: (payload: BridgePayload) => Promise<unknown>;
    approveAgent: (payload: BridgePayload) => Promise<unknown>;
    rejectAgent: (payload: BridgePayload) => Promise<unknown>;
    cancelAgent: (payload: BridgePayload) => Promise<unknown>;
    listAgentTasks: () => Promise<unknown>;
    listTools: () => Promise<unknown>;
    dryRunTool: (payload: BridgePayload) => Promise<unknown>;
    listMemories: () => Promise<unknown>;
    searchMemories: (payload: BridgePayload) => Promise<unknown>;
    saveMemory: (payload: BridgePayload) => Promise<unknown>;
    updateMemory: (payload: BridgePayload) => Promise<unknown>;
    deleteMemory: (payload: BridgePayload) => Promise<unknown>;
    listNotes: () => Promise<unknown>;
    searchNotes: (payload: BridgePayload) => Promise<unknown>;
    createNote: (payload: BridgePayload) => Promise<unknown>;
    readNote: (payload: BridgePayload) => Promise<unknown>;
    updateNote: (payload: BridgePayload) => Promise<unknown>;
    deleteNote: (payload: BridgePayload) => Promise<unknown>;
    listProjects: () => Promise<unknown>;
    addProject: (payload: BridgePayload) => Promise<unknown>;
    scanProject: (payload: BridgePayload) => Promise<unknown>;
    voiceStatus: () => Promise<unknown>;
    getVoiceConfig: () => Promise<unknown>;
    updateVoiceConfig: (payload: BridgePayload) => Promise<unknown>;
    listVoiceOptions: () => Promise<unknown>;
    logVoiceEvent: (payload: BridgePayload) => Promise<unknown>;
    clearAllData: () => Promise<unknown>;
    onHotkey: (callback: (name: string) => void) => () => void;
    onAgentEvent: (callback: (payload: unknown) => void) => () => void;
    onApprovalRequest: (callback: (payload: unknown) => void) => () => void;
  };
}
