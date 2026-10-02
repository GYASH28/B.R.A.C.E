const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld("braceDesktop", {
  platform: process.platform,
  appMode: "desktop",
  brainPathHint: "",
  state: () => invoke("state:get"),
  updateSettings: (patch) => invoke("settings:update", patch),
  updatePermission: (payload) => invoke("permissions:update", payload),
  listLogs: () => invoke("logs:list"),
  clearLogs: () => invoke("logs:clear"),
  listChat: () => invoke("chat:list"),
  saveChat: (messages) => invoke("chat:save", messages),
  clearChat: () => invoke("chat:clear"),
  systemInfo: () => invoke("system:get"),
  selectFiles: () => invoke("files:select"),
  selectFolder: () => invoke("folders:select"),
  analyzeFile: (payload) => invoke("files:analyze", payload),
  listTasks: () => invoke("tasks:list"),
  saveTasks: (tasks) => invoke("tasks:save", tasks),
  runTask: (task) => invoke("tasks:run", task),
  listApps: () => invoke("apps:list"),
  addApp: () => invoke("apps:add"),
  deleteApp: (id) => invoke("apps:delete", id),
  launchApp: (app) => invoke("apps:launch", app),
  codexStatus: () => invoke("codex:status"),
  codexRun: (payload) => invoke("codex:run", payload),
  codexInterrupt: () => invoke("codex:interrupt"),
  codexNewThread: () => invoke("codex:new-thread"),
  codexApproval: (payload) => invoke("codex:approval", payload),
  secondBrainStatus: () => invoke("brain:status"),
  secondBrainSearch: (payload) => invoke("brain:search", payload),
  selectSecondBrain: () => invoke("brain:select"),
  listTools: () => invoke("tools:list"),
  dryRunTool: (payload) => invoke("tools:dry-run", payload),
  listMemories: () => invoke("memory:list"),
  searchMemories: (payload) => invoke("memory:search", payload),
  saveMemory: (payload) => invoke("memory:save", payload),
  updateMemory: (payload) => invoke("memory:update", payload),
  deleteMemory: (payload) => invoke("memory:delete", payload),
  listNotes: () => invoke("notes:list"),
  searchNotes: (payload) => invoke("notes:search", payload),
  createNote: (payload) => invoke("notes:create", payload),
  readNote: (payload) => invoke("notes:read", payload),
  updateNote: (payload) => invoke("notes:update", payload),
  deleteNote: (payload) => invoke("notes:delete", payload),
  listProjects: () => invoke("projects:list"),
  addProject: (payload) => invoke("projects:add", payload),
  scanProject: (payload) => invoke("projects:scan", payload),
  localVoiceStatus: () => invoke("voice-local:status"),
  warmLocalVoice: () => invoke("voice-local:warm"),
  transcribeLocalVoice: (payload) => invoke("voice-local:transcribe", payload),
  synthesizeLocalVoice: (payload) => invoke("voice-local:synthesize", payload),
  warmWakeWord: () => invoke("voice-local:wake-warm"),
  predictWakeWord: (payload) => invoke("voice-local:wake-predict", payload),
  resetWakeWord: () => invoke("voice-local:wake-reset"),
  clearAllData: () => invoke("data:clear-all"),
  onHotkey: (callback) => {
    const listener = (_event, name) => callback(name);
    ipcRenderer.on("brace:hotkey", listener);
    return () => ipcRenderer.removeListener("brace:hotkey", listener);
  },
  onAgentEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("brace:agent-event", listener);
    return () => ipcRenderer.removeListener("brace:agent-event", listener);
  },
  onCodexStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("brace:codex-status", listener);
    return () => ipcRenderer.removeListener("brace:codex-status", listener);
  },
  onCodexDelta: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("brace:codex-delta", listener);
    return () => ipcRenderer.removeListener("brace:codex-delta", listener);
  },
  onCodexEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("brace:codex-event", listener);
    return () => ipcRenderer.removeListener("brace:codex-event", listener);
  },
  onCodexApproval: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("brace:codex-approval", listener);
    return () => ipcRenderer.removeListener("brace:codex-approval", listener);
  },
  onLocalVoiceStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("brace:local-voice-status", listener);
    return () => ipcRenderer.removeListener("brace:local-voice-status", listener);
  },
  onLocalVoiceEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("brace:local-voice-event", listener);
    return () => ipcRenderer.removeListener("brace:local-voice-event", listener);
  },
  onApprovalRequest: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("brace:approval-request", listener);
    return () => ipcRenderer.removeListener("brace:approval-request", listener);
  },
});
