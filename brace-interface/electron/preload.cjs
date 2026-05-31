const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld("braceDesktop", {
  platform: process.platform,
  appMode: "desktop",
  brainPathHint: "C:/Users/Admin/Documents/BRACE-Brain",
  state: () => invoke("state:get"),
  updateSettings: (patch) => invoke("settings:update", patch),
  saveSecret: (payload) => invoke("settings:save-secret", payload),
  updatePermission: (payload) => invoke("permissions:update", payload),
  listLogs: () => invoke("logs:list"),
  clearLogs: () => invoke("logs:clear"),
  listChat: () => invoke("chat:list"),
  saveChat: (messages) => invoke("chat:save", messages),
  clearChat: () => invoke("chat:clear"),
  askAi: (payload) => invoke("ai:chat", payload),
  testAi: () => invoke("ai:test"),
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
  runAgent: (payload) => invoke("agent:run", payload),
  approveAgent: (payload) => invoke("agent:approve", payload),
  rejectAgent: (payload) => invoke("agent:reject", payload),
  cancelAgent: (payload) => invoke("agent:cancel", payload),
  listAgentTasks: () => invoke("agent:list"),
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
  voiceStatus: () => invoke("voice:status"),
  getVoiceConfig: () => invoke("voice:config:get"),
  updateVoiceConfig: (payload) => invoke("voice:config:update", payload),
  listVoiceOptions: () => invoke("voice:voices"),
  logVoiceEvent: (payload) => invoke("voice:log", payload),
  clearAllData: () => invoke("data:clear-all"),

  // Voicebox
  voiceboxStatus: () => invoke("voicebox:status"),
  voiceboxProfiles: () => invoke("voicebox:profiles"),
  voiceboxSpeak: (payload) => invoke("voicebox:speak", payload),
  voiceboxTranscribe: (payload) => invoke("voicebox:transcribe", payload),
  voiceboxTest: (payload) => invoke("voicebox:test", payload),
  voiceboxStop: () => invoke("voicebox:stop"),

  // GitNexus
  gitnexusStatus: (payload) => invoke("gitnexus:status", payload),
  gitnexusIndex: (payload) => invoke("gitnexus:index", payload),
  gitnexusDocs: (payload) => invoke("gitnexus:docs", payload),
  gitnexusOpenDoc: (payload) => invoke("gitnexus:openDoc", payload),
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
  onApprovalRequest: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("brace:approval-request", listener);
    return () => ipcRenderer.removeListener("brace:approval-request", listener);
  },
});
