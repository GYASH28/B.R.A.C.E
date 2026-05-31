const os = require("node:os");
const path = require("node:path");
const { defaultPermissions } = require("../security/permissionManager.cjs");

const VAULT_PATH = path.resolve(__dirname, "..", "..", "..");
const DATA_DIR_NAME = "_BRACE_DATA";

function defaultSettings() {
  return {
    aiProvider: process.env.BRACE_AI_PROVIDER || "gemini",
    model: process.env.BRACE_MODEL || "gemini-1.5-flash",
    apiKey: process.env.BRACE_API_KEY || "",
    baseUrl: process.env.BRACE_BASE_URL || "http://127.0.0.1:11434",
    temperature: Number(process.env.BRACE_TEMPERATURE || 0.35),
    maxTokens: Number(process.env.BRACE_MAX_TOKENS || 1200),
    streaming: false,
    localMode: String(process.env.BRACE_LOCAL_MODE || "true").toLowerCase() !== "false",
    geminiKey: "",
    openAiBaseUrl: process.env.BRACE_OPENAI_BASE_URL || "http://127.0.0.1:1234/v1",
    openAiApiKey: "",
    openAiModel: process.env.BRACE_OPENAI_MODEL || "local-model",
    ollamaEndpoint: process.env.BRACE_OLLAMA_ENDPOINT || "http://127.0.0.1:11434",
    ollamaModel: process.env.BRACE_OLLAMA_MODEL || "llama3.2",
    customEndpoint: process.env.BRACE_CUSTOM_ENDPOINT || "http://127.0.0.1:8000/chat",
    offlineMode: false,
    safeMode: true,
    voiceRate: 1,
    voicePitch: 1,
    voiceOutput: true,
    wakeWord: false,
    themeAccent: "cyan",
    defaultProjectsFolder: path.join(os.homedir(), "Documents"),
    defaultDownloadsFolder: path.join(os.homedir(), "Downloads"),
    safeFolders: [VAULT_PATH, path.join(os.homedir(), "Documents"), path.join(os.homedir(), "Downloads")],
    appPaths: {
      vscode: "code",
      chrome: "chrome",
    },
    hotkeys: {
      openAssistant: "Ctrl+Alt+B",
      startVoice: "Ctrl+Alt+Space",
      mute: "Ctrl+Alt+M",
      commandPalette: "Ctrl+K",
    },
    startup: false,
    adminMode: false,
  };
}

function defaultState() {
  return {
    version: 2,
    settings: defaultSettings(),
    permissions: defaultPermissions(),
    tasks: [],
    apps: [],
    chatHistory: [],
    logs: [],
    agentTasks: [],
    approvals: [],
    recentCommands: [],
    recentToolCalls: [],
  };
}

module.exports = { DATA_DIR_NAME, VAULT_PATH, defaultSettings, defaultState };
