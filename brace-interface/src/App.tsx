import { useCallback, useEffect, useState } from "react";
import type { ElementType, ReactNode } from "react";
import {
  Bot,
  Clipboard,
  Copy,
  Database,
  Download,
  Edit3,
  EyeOff,
  FileSearch,
  FolderOpen,
  Keyboard,
  ListChecks,
  Mic,
  Play,
  Plus,
  Power,
  RefreshCw,
  Rocket,
  Search,
  Shield,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  ApiKeyField,
  ChatBubble,
  ChatInput,
  GlassCard,
  PageShell,
  SettingsToggle,
  Sidebar,
  StatusBadge,
  SystemMetricCard,
  TopBar,
} from "./components/Interface";
import { navItems } from "./data/appData";
import { searchBrain } from "./lib/brain";
import { VoiceControls } from "./voice/VoiceControls";
import { VoiceOrb } from "./voice/VoiceOrb";
import { VoiceSettings } from "./voice/VoiceSettings";
import { VoiceStatusPill } from "./voice/VoiceStatusPill";
import { useVoiceAgent } from "./voice/useVoiceAgent";
import { voiceStateLabel } from "./voice/voiceStateStore";
import type {
  AppLauncherEntry,
  AgentTaskRecord,
  ApprovalRequest,
  AssistantTask,
  ChatMessage,
  FileEntry,
  LogEntry,
  MemoryRecord,
  NoteEntry,
  PageId,
  PermissionState,
  ProjectInfo,
  SettingsState,
  SystemInfo,
  ToolDefinition,
} from "./types";

type PermissionsMap = Record<string, PermissionState>;
type BridgeState = {
  settings: SettingsState;
  permissions: PermissionsMap;
  tasks: AssistantTask[];
  apps: AppLauncherEntry[];
  chatHistory: ChatMessage[];
  logs: LogEntry[];
  agentTasks?: AgentTaskRecord[];
  approvals?: ApprovalRequest[];
  projects?: ProjectInfo[];
};
type ToastState = { kind: "success" | "error" | "info"; text: string } | null;
type DragFile = FileEntry & { text?: string; source: "drop" | "dialog" };

const defaultSettings: SettingsState = {
  aiProvider: "gemini",
  model: "gemini-1.5-flash",
  apiKey: "",
  baseUrl: "http://127.0.0.1:11434",
  temperature: 0.35,
  maxTokens: 1200,
  streaming: false,
  localMode: true,
  geminiKey: "",
  openAiBaseUrl: "http://127.0.0.1:1234/v1",
  openAiApiKey: "",
  openAiModel: "local-model",
  ollamaEndpoint: "http://127.0.0.1:11434",
  ollamaModel: "llama3.2",
  customEndpoint: "http://127.0.0.1:8000/chat",
  offlineMode: false,
  safeMode: true,
  voiceRate: 1,
  voicePitch: 1,
  voiceOutput: true,
  wakeWord: true,
  themeAccent: "cyan",
  hotkeys: {
    openAssistant: "Ctrl+Alt+B",
    startVoice: "Ctrl+Alt+Space",
    mute: "Ctrl+Alt+M",
    commandPalette: "Ctrl+K",
  },
  startup: false,
  adminMode: false,
  defaultProjectsFolder: "C:\\Users\\Admin\\Documents",
  defaultDownloadsFolder: "C:\\Users\\Admin\\Downloads",
  safeFolders: ["C:\\Users\\Admin\\Documents\\BRACE-Brain"],
  appPaths: { vscode: "code", chrome: "chrome" },
};

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    role: "system",
    source: "system",
    text: "B.R.A.C.E initialized. Local brain is checked before any external AI provider.",
  },
  {
    id: 2,
    role: "assistant",
    source: "brain",
    confidence: 92,
    text:
      "Brain link ready: Obsidian vault is the primary memory layer. External AI is only used after local search fails.",
  },
];

const defaultPermissions: PermissionsMap = {
  microphone: { label: "Microphone", description: "Allows voice input through your microphone.", enabled: false, lastUsed: null },
  aiModel: { label: "AI model access", description: "Allows B.R.A.C.E to call the configured model.", enabled: false, lastUsed: null, riskLevel: "medium" },
  files: { label: "File access", description: "Allows reading only files you select.", enabled: false, lastUsed: null },
  fileWrite: { label: "File write", description: "Allows approved file creation and edits.", enabled: false, lastUsed: null, riskLevel: "high" },
  folders: { label: "Folder access", description: "Allows reading or cleaning only folders you select.", enabled: false, lastUsed: null },
  shell: { label: "Shell command", description: "Allows approved local actions such as app launch.", enabled: false, lastUsed: null },
  appLaunch: { label: "App launching", description: "Allows opening apps, folders, URLs, and VS Code.", enabled: false, lastUsed: null, riskLevel: "medium" },
  coding: { label: "Coding agent edits", description: "Allows project scans, diffs, backups, and approved edits.", enabled: false, lastUsed: null, riskLevel: "high" },
  memoryRead: { label: "Memory read", description: "Allows local memory search.", enabled: false, lastUsed: null },
  memoryWrite: { label: "Memory write", description: "Allows approved memory saves.", enabled: false, lastUsed: null, riskLevel: "medium" },
  browser: { label: "Browser automation", description: "Allows controlled browser automation.", enabled: false, lastUsed: null, riskLevel: "high" },
  mcp: { label: "MCP tools", description: "Allows configured MCP tools.", enabled: false, lastUsed: null, riskLevel: "high" },
  git: { label: "Git operations", description: "Allows approved git operations.", enabled: false, lastUsed: null, riskLevel: "high" },
  systemInfo: { label: "System info", description: "Allows reading CPU, RAM, storage, network, battery, and OS status.", enabled: false, lastUsed: null },
  notifications: { label: "Notifications", description: "Allows visible desktop notifications.", enabled: false, lastUsed: null },
  startup: { label: "Startup", description: "Allows launching B.R.A.C.E at Windows login.", enabled: false, lastUsed: null },
  admin: { label: "Admin-required actions", description: "Allows specific actions to request Windows elevation. Off by default.", enabled: false, lastUsed: null },
};

const isDesktop = () => Boolean(window.braceDesktop);
const id = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const formatTime = () =>
  new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(
    new Date(),
  );
const niceBytes = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [time, setTime] = useState(formatTime);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [secretDrafts, setSecretDrafts] = useState({ geminiKey: "", openAiApiKey: "" });
  const [secretStatus, setSecretStatus] = useState("Paste the key, then click Save key.");
  const [permissions, setPermissions] = useState<PermissionsMap>(defaultPermissions);
  const [tasks, setTasks] = useState<AssistantTask[]>([]);
  const [agentTasks, setAgentTasks] = useState<AgentTaskRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [apps, setApps] = useState<AppLauncherEntry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [memoryQuery, setMemoryQuery] = useState("");
  const [notesQuery, setNotesQuery] = useState("");
  const [files, setFiles] = useState<DragFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [fileQuestion, setFileQuestion] = useState("");
  const [fileResult, setFileResult] = useState("");
  const [fileBusy, setFileBusy] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemError, setSystemError] = useState("");
  const [systemBusy, setSystemBusy] = useState(false);
  const [homeMode, setHomeMode] = useState("agent");
  const [taskOutput, setTaskOutput] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState("");
  const [loaded, setLoaded] = useState(false);

  const hasGeminiKey = settings.geminiKey === "__saved__";
  const selectedFile = files.find((file) => file.id === selectedFileId) ?? files[0];

  const showToast = (kind: NonNullable<ToastState>["kind"], text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 3800);
  };

  const refreshLogs = async () => {
    if (!window.braceDesktop) return;
    const nextLogs = (await window.braceDesktop.listLogs()) as LogEntry[];
    setLogs(nextLogs);
  };

  const refreshAgentState = async () => {
    if (!window.braceDesktop) return;
    const response = (await window.braceDesktop.listAgentTasks()) as { tasks?: AgentTaskRecord[]; approvals?: ApprovalRequest[] };
    setAgentTasks(response.tasks ?? []);
    setApprovals((response.approvals ?? []).filter((approval) => approval.status === "pending"));
  };

  const refreshWorkspaceData = async () => {
    if (!window.braceDesktop) return;
    const [nextTools, nextMemories, nextNotes, nextProjects] = await Promise.all([
      window.braceDesktop.listTools() as Promise<ToolDefinition[]>,
      window.braceDesktop.listMemories() as Promise<MemoryRecord[]>,
      window.braceDesktop.listNotes() as Promise<NoteEntry[]>,
      window.braceDesktop.listProjects() as Promise<ProjectInfo[]>,
    ]);
    setTools(nextTools ?? []);
    setMemories(nextMemories ?? []);
    setNotes(nextNotes ?? []);
    setProjects(nextProjects ?? []);
  };

  const updateSettings = async (patch: Partial<SettingsState>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await window.braceDesktop?.updateSettings(patch);
  };

  const updatePermission = async (name: string, enabled: boolean) => {
    if (!window.braceDesktop) return;
    if (enabled && name === "microphone") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        showToast("error", `Microphone permission failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        return;
      }
    }
    const nextPermissions = (await window.braceDesktop.updatePermission({ name, enabled })) as PermissionsMap;
    setPermissions(nextPermissions);
    await refreshLogs();
  };

  const saveSecret = async (key: "geminiKey" | "openAiApiKey", value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 8) {
      setSecretStatus("That key looks too short. Paste the full key before saving.");
      return;
    }
    await window.braceDesktop?.saveSecret({ key, value: trimmed });
    setSettings((current) => ({ ...current, [key]: "__saved__" }));
    setSecretDrafts((current) => ({ ...current, [key]: "" }));
    setSecretStatus(`${key === "geminiKey" ? "Gemini" : "OpenAI-compatible"} key saved locally.`);
    await refreshLogs();
  };

  const clearSecret = async (key: "geminiKey" | "openAiApiKey") => {
    await window.braceDesktop?.saveSecret({ key, value: "" });
    setSettings((current) => ({ ...current, [key]: "" }));
    setSecretDrafts((current) => ({ ...current, [key]: "" }));
    setSecretStatus("Key cleared.");
    await refreshLogs();
  };

  const addVoiceMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => [...current, message]);
  }, []);

  const runAgentCommand = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return "I did not hear a command.";

    const brainMatch = searchBrain(trimmed);
    if (brainMatch) {
      const text = `${brainMatch.answer}\n\nBrain source: ${brainMatch.source}`;
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", source: "brain", confidence: brainMatch.confidence, text }]);
      return text;
    }

    if (settings.offlineMode) {
      const text = "Offline Mode is enabled. I checked the local brain and did not find a strong match. External AI was not called.";
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", source: "system", text }]);
      return text;
    }

    const pendingId = Date.now() + 1;
    setMessages((current) => [...current, { id: pendingId, role: "assistant", source: "agent", confidence: 50, text: "I am thinking through the safest route..." }]);
    const result = (await window.braceDesktop?.runAgent({
      command: trimmed,
      selectedFile: selectedFile?.source === "dialog" ? selectedFile : null,
      workspacePath: projects[0]?.path,
    })) as { ok: boolean; text?: string; error?: string; provider?: string; mode?: string };
    if (!result?.ok && !result?.text) throw new Error(result?.error ?? "Agent runtime failed.");
    const finalText = `${result.text ?? "Agent task updated."}\n\nRoute: local brain checked first -> B.R.A.C.E agent${result.provider ? ` -> ${result.provider}` : ""}.`;
    setMessages((current) => current.map((message) => (message.id === pendingId ? { ...message, source: "agent", confidence: 76, text: finalText } : message)));
    await refreshAgentState();
    await refreshLogs();
    return finalText;
  }, [projects, selectedFile, settings.offlineMode]);

  const voiceAgent = useVoiceAgent({ addMessage: addVoiceMessage, sendCommand: runAgentCommand });

  useEffect(() => {
    const timer = window.setInterval(() => setTime(formatTime()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!window.braceDesktop) {
        setLoaded(true);
        return;
      }
      const state = (await window.braceDesktop.state()) as BridgeState;
      setSettings({ ...defaultSettings, ...state.settings });
      setPermissions({ ...defaultPermissions, ...state.permissions });
      setTasks(state.tasks ?? []);
      setAgentTasks(state.agentTasks ?? []);
      setApprovals((state.approvals ?? []).filter((approval) => approval.status === "pending"));
      setProjects(state.projects ?? []);
      setApps(state.apps ?? []);
      setLogs(state.logs ?? []);
      setMessages(state.chatHistory?.length ? state.chatHistory : initialMessages);
      void refreshWorkspaceData();
      setLoaded(true);
    };
    void load();
  }, []);

  useEffect(() => {
    if (!loaded || !window.braceDesktop) return;
    void window.braceDesktop.saveChat(messages);
  }, [messages, loaded]);

  useEffect(() => {
    if (!loaded || !permissions.systemInfo?.enabled) return;
    void refreshSystem();
    const interval = window.setInterval(() => void refreshSystem(), 4000);
    return () => window.clearInterval(interval);
  }, [loaded, permissions.systemInfo?.enabled]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const dispose = window.braceDesktop?.onHotkey?.((name) => {
      if (name === "commandPalette") setPaletteOpen(true);
      if (name === "startVoice") setActivePage("voice");
      if (name === "mute") void voiceAgent.updateConfig({ volume: voiceAgent.config.volume > 0 ? 0 : 0.9 });
      if (name === "openAssistant") setActivePage("home");
    });
    return () => dispose?.();
  }, [voiceAgent]);

  useEffect(() => {
    const disposeApproval = window.braceDesktop?.onApprovalRequest?.((payload) => {
      const approval = payload as ApprovalRequest;
      setApprovals((current) => [approval, ...current.filter((item) => item.id !== approval.id)]);
      setActivePage("chat");
    });
    const disposeAgent = window.braceDesktop?.onAgentEvent?.(() => {
      void refreshAgentState();
    });
    return () => {
      disposeApproval?.();
      disposeAgent?.();
    };
  }, []);

  const refreshSystem = async () => {
    if (!window.braceDesktop || !permissions.systemInfo?.enabled) return;
    setSystemBusy(true);
    setSystemError("");
    try {
      const response = (await window.braceDesktop.systemInfo()) as { ok: boolean; info: SystemInfo };
      setSystemInfo(response.info);
    } catch (error) {
      setSystemError(error instanceof Error ? error.message : "System info failed.");
    } finally {
      setSystemBusy(false);
    }
  };

  const sendMessage = async (override?: string) => {
    const query = (override ?? input).trim();
    if (!query) return;

    const userMessage: ChatMessage = { id: Date.now(), role: "user", text: query };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLastFailedPrompt("");

    try {
      await runAgentCommand(query);
    } catch (error) {
      const text = `AI error: ${error instanceof Error ? error.message : "Unknown error"}`;
      setLastFailedPrompt(query);
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", source: "system", confidence: 0, text }]);
      await refreshLogs();
    }
  };

  const clearChat = async () => {
    if (!window.confirm("Clear local chat history?")) return;
    setMessages(initialMessages);
    await window.braceDesktop?.clearChat();
    await refreshLogs();
  };

  const approveAgentAction = async (approvalId: string) => {
    const result = (await window.braceDesktop?.approveAgent({ approvalId })) as { ok: boolean; text?: string; error?: string };
    const text = result?.text ?? (result?.ok ? "Approved and executed." : `Approval failed: ${result?.error ?? "Unknown error"}`);
    setMessages((current) => [...current, { id: Date.now(), role: "assistant", source: "agent", text }]);
    await refreshAgentState();
    await refreshLogs();
  };

  const rejectAgentAction = async (approvalId: string) => {
    const result = (await window.braceDesktop?.rejectAgent({ approvalId })) as { ok: boolean; text?: string };
    setMessages((current) => [...current, { id: Date.now(), role: "assistant", source: "agent", text: result?.text ?? "Rejected. I did not run the task." }]);
    await refreshAgentState();
    await refreshLogs();
  };

  const exportChat = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `brace-chat-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectFiles = async () => {
    try {
      if (!permissions.files?.enabled) {
        await updatePermission("files", true);
      }
      const response = (await window.braceDesktop?.selectFiles()) as { ok: boolean; files: FileEntry[] };
      const next = (response?.files ?? []).map((file) => ({ ...file, source: "dialog" as const }));
      setFiles((current) => [...next, ...current]);
      if (next[0]) setSelectedFileId(next[0].id);
      await refreshLogs();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "File selection failed.");
    }
  };

  const onDropFiles = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const dropped = await Promise.all(
      Array.from(event.dataTransfer.files).map(async (file) => ({
        id: id(),
        path: "",
        name: file.name,
        extension: file.name.includes(".") ? `.${file.name.split(".").pop()?.toLowerCase()}` : "unknown",
        size: file.size,
        modified: new Date(file.lastModified).toISOString(),
        source: "drop" as const,
        text: file.type.startsWith("text") || /\.(txt|md|csv|json|js|ts|tsx|py|html|css)$/i.test(file.name) ? await file.text() : "",
      })),
    );
    setFiles((current) => [...dropped, ...current]);
    if (dropped[0]) setSelectedFileId(dropped[0].id);
  };

  const analyzeFile = async (action: "summarize" | "explain" | "key-points" | "question") => {
    if (!selectedFile) return;
    setFileBusy(true);
    setFileResult("");
    try {
      if (selectedFile.source === "drop") {
        const text = selectedFile.text ?? "";
        if (!text) throw new Error("Dropped binary files need Select Files so the desktop bridge can read them.");
        const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 12);
        setFileResult(
          action === "key-points"
            ? lines.map((line) => `- ${line.slice(0, 220)}`).join("\n")
            : action === "question"
              ? lines.filter((line) => line.toLowerCase().includes(fileQuestion.toLowerCase().split(" ")[0] ?? "")).join("\n") ||
                "No direct match found in dropped text."
              : text.replace(/\s+/g, " ").slice(0, 1400),
        );
        return;
      }
      const response = (await window.braceDesktop?.analyzeFile({
        filePath: selectedFile.path,
        action,
        question: fileQuestion,
      })) as { ok: boolean; result: string };
      setFileResult(response.result);
      await refreshLogs();
    } catch (error) {
      setFileResult(`File action failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setFileBusy(false);
    }
  };

  const saveTasks = async (nextTasks: AssistantTask[]) => {
    setTasks(nextTasks);
    await window.braceDesktop?.saveTasks(nextTasks);
    await refreshLogs();
  };

  const addTask = () => {
    const title = window.prompt("Task name");
    if (!title) return;
    const nextTask: AssistantTask = {
      id: id(),
      title,
      type: "focus-timer",
      enabled: true,
      trusted: false,
      detail: "New safe local task.",
      payload: { minutes: 25 },
    };
    void saveTasks([nextTask, ...tasks]);
  };

  const runTask = async (task: AssistantTask) => {
    if (!task.enabled) {
      showToast("error", "Task is disabled.");
      return;
    }
    if (!permissions.appLaunch?.enabled) {
      await updatePermission("appLaunch", true);
    }
    if (!task.trusted && !window.confirm(`Run this local action?\n\n${task.title}\n\n${task.detail}`)) return;
    try {
      const response = (await window.braceDesktop?.runTask(task)) as { ok: boolean; output: string };
      setTaskOutput(response.output);
      showToast("success", response.output);
      await refreshLogs();
    } catch (error) {
      setTaskOutput(error instanceof Error ? error.message : "Task failed.");
      await refreshLogs();
    }
  };

  const addApp = async () => {
    if (!permissions.appLaunch?.enabled) {
      await updatePermission("appLaunch", true);
    }
    const response = (await window.braceDesktop?.addApp()) as { ok: boolean; app: AppLauncherEntry | null };
    if (response?.app) setApps((current) => [response.app as AppLauncherEntry, ...current]);
    await refreshLogs();
  };

  const launchApp = async (app: AppLauncherEntry) => {
    if (!permissions.appLaunch?.enabled) {
      await updatePermission("appLaunch", true);
    }
    if (!app.trusted && !window.confirm(`Open this app?\n\n${app.name}\n${app.path}`)) return;
    await window.braceDesktop?.launchApp(app);
    await refreshLogs();
    showToast("success", `Launched ${app.name}`);
  };

  const deleteApp = async (appId: string) => {
    if (!window.confirm("Remove this launcher entry?")) return;
    await window.braceDesktop?.deleteApp(appId);
    setApps((current) => current.filter((app) => app.id !== appId));
    await refreshLogs();
  };

  const clearAllData = async () => {
    if (!window.confirm("Danger Zone: clear all B.R.A.C.E local app data? This cannot be undone.")) return;
    await window.braceDesktop?.clearAllData();
    window.location.reload();
  };

  const pages = navItems.map((item) => ({ label: item.label, page: item.id }));
  const commandItems = [
    ...pages.map((page) => ({ label: `Open ${page.label}`, run: () => setActivePage(page.page) })),
    { label: "Start voice mode", run: () => setActivePage("voice") },
    { label: "Select files", run: () => void selectFiles() },
    { label: "Refresh system monitor", run: () => void refreshSystem() },
    ...apps.map((app) => ({ label: `Launch ${app.name}`, run: () => void launchApp(app) })),
  ].filter((item) => item.label.toLowerCase().includes(paletteQuery.toLowerCase()));

  const renderPage = () => {
    switch (activePage) {
      case "chat":
        return (
          <ChatPage
            apiReady={!settings.offlineMode}
            approvals={approvals}
            input={input}
            lastFailedPrompt={lastFailedPrompt}
            messages={messages}
            onApprove={approveAgentAction}
            onAttach={selectFiles}
            onClear={clearChat}
            onExport={exportChat}
            onInput={setInput}
            onReject={rejectAgentAction}
            onRetry={() => void sendMessage(lastFailedPrompt)}
            onSend={() => void sendMessage()}
            onVoice={() => setActivePage("voice")}
            provider={settings.aiProvider}
          />
        );
      case "voice":
        return (
          <VoiceSettings
            browserVoiceOptions={voiceAgent.browserVoiceOptions}
            config={voiceAgent.config}
            devices={voiceAgent.devices}
            error={voiceAgent.error}
            onPreview={() => void voiceAgent.previewVoice()}
            onRefresh={() => void voiceAgent.refreshVoiceStatus()}
            onReplay={() => void voiceAgent.replayLast()}
            onStart={() => void voiceAgent.startListening()}
            onStop={voiceAgent.stopListening}
            onStopAudio={voiceAgent.stopAllAudio}
            onUpdate={(patch) => void voiceAgent.updateConfig(patch)}
            partialTranscript={voiceAgent.partialTranscript}
            selectedDeviceId={voiceAgent.selectedDeviceId}
            setSelectedDeviceId={voiceAgent.setSelectedDeviceId}
            status={voiceAgent.status}
            transcript={voiceAgent.transcript}
          />
        );
      case "files":
        return (
          <FilesPage
            busy={fileBusy}
            files={files}
            onAnalyze={analyzeFile}
            onDrop={onDropFiles}
            onQuestion={setFileQuestion}
            onSelect={selectFiles}
            question={fileQuestion}
            result={fileResult}
            selectedFile={selectedFile}
            selectedFileId={selectedFileId}
            setSelectedFileId={setSelectedFileId}
          />
        );
      case "agent":
        return <AgentTasksPage approvals={approvals} onApprove={approveAgentAction} onReject={rejectAgentAction} tasks={agentTasks} />;
      case "memory":
        return <MemoryPage memories={memories} query={memoryQuery} onQuery={setMemoryQuery} onRefresh={async () => { const next = (await window.braceDesktop?.searchMemories({ query: memoryQuery })) as MemoryRecord[]; setMemories(next ?? []); }} onSave={async () => { const title = window.prompt("Memory title"); const content = window.prompt("Memory content"); if (!title || !content) return; await window.braceDesktop?.saveMemory({ type: "project", title, content, tags: ["manual"] }); await refreshWorkspaceData(); await refreshLogs(); }} onDelete={async (id) => { if (!window.confirm("Delete this memory?")) return; await window.braceDesktop?.deleteMemory({ id }); await refreshWorkspaceData(); }} />;
      case "notes":
        return <NotesPage notes={notes} query={notesQuery} onQuery={setNotesQuery} onRefresh={async () => { const next = (await window.braceDesktop?.searchNotes({ query: notesQuery })) as NoteEntry[]; setNotes(next ?? []); }} onCreate={async () => { const title = window.prompt("Note title"); const content = window.prompt("Note content"); if (!title || !content) return; await window.braceDesktop?.createNote({ title, content, topic: "brace" }); await refreshWorkspaceData(); }} onDelete={async (id) => { if (!window.confirm("Move this note to recycle bin?")) return; await window.braceDesktop?.deleteNote({ id }); await refreshWorkspaceData(); }} />;
      case "tools":
        return <ToolsPage tools={tools} onRefresh={refreshWorkspaceData} />;
      case "projects":
        return <ProjectsPage projects={projects} onAdd={async () => { const projectPath = window.prompt("Project folder path"); if (!projectPath) return; const project = (await window.braceDesktop?.addProject({ projectPath })) as ProjectInfo; setProjects((current) => [project, ...current.filter((item) => item.path !== project.path)]); await refreshLogs(); }} onRefresh={refreshWorkspaceData} />;
      case "system":
        return (
          <SystemPage
            busy={systemBusy}
            error={systemError}
            info={systemInfo}
            onEnable={() => void updatePermission("systemInfo", true)}
            onRefresh={() => void refreshSystem()}
            permissionEnabled={permissions.systemInfo?.enabled ?? false}
          />
        );
      case "tasks":
        return <TasksPage addTask={addTask} onRun={runTask} output={taskOutput} saveTasks={saveTasks} tasks={tasks} />;
      case "apps":
        return <AppsPage apps={apps} onAdd={addApp} onDelete={deleteApp} onLaunch={launchApp} />;
      case "permissions":
        return <PermissionsPage onToggle={updatePermission} permissions={permissions} />;
      case "logs":
        return <LogsPage logs={logs} onClear={async () => { await window.braceDesktop?.clearLogs(); setLogs([]); }} onRefresh={refreshLogs} />;
      case "settings":
        return (
          <SettingsPage
            clearAllData={clearAllData}
            clearSecret={clearSecret}
            secretDrafts={secretDrafts}
            secretStatus={secretStatus}
            setSecretDrafts={setSecretDrafts}
            settings={settings}
            updateSettings={updateSettings}
            saveSecret={saveSecret}
          />
        );
      case "home":
      default:
        return (
          <HomePage
            desktopReady={isDesktop()}
            input={input}
            mode={homeMode}
            onNavigate={setActivePage}
            onAttach={selectFiles}
            onInput={setInput}
            onMode={setHomeMode}
            onSend={() => void sendMessage()}
            onStopVoice={voiceAgent.stopAllAudio}
            onVoice={() => void voiceAgent.startListening()}
            provider={settings.offlineMode ? "offline" : settings.aiProvider}
            safeMode={settings.safeMode}
            voiceAgent={voiceAgent}
          />
        );
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--app-bg)] text-slate-100">
      <div className="background-grid" />
      <div className="background-glow background-glow-a" />
      <div className="background-glow background-glow-b" />

      <div className="relative z-10 flex h-screen">
        <Sidebar
          activePage={activePage}
          collapsed={sidebarCollapsed}
          items={navItems}
          onNavigate={setActivePage}
          onToggle={() => setSidebarCollapsed((value) => !value)}
        />
        <section className="flex min-w-0 flex-1 flex-col">
          <TopBar hasGeminiKey={hasGeminiKey || settings.aiProvider !== "gemini"} micActive={voiceAgent.listening} systemInfo={systemInfo} time={time} />
          <PageShell pageKey={activePage}>{renderPage()}</PageShell>
        </section>
      </div>

      <CommandPalette
        items={commandItems}
        onClose={() => setPaletteOpen(false)}
        open={paletteOpen}
        query={paletteQuery}
        setQuery={setPaletteQuery}
      />

      {toast && (
        <div
          className={[
            "fixed bottom-5 right-5 z-50 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl",
            toast.kind === "error"
              ? "border-rose-300/30 bg-rose-950/70 text-rose-100"
              : toast.kind === "success"
                ? "border-emerald-300/30 bg-emerald-950/70 text-emerald-100"
                : "border-cyan-300/30 bg-cyan-950/70 text-cyan-100",
          ].join(" ")}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function HomePage({
  desktopReady,
  input,
  mode,
  onAttach,
  onInput,
  onMode,
  onNavigate,
  onSend,
  onStopVoice,
  onVoice,
  voiceAgent,
}: {
  desktopReady: boolean;
  input: string;
  mode: string;
  onAttach: () => void;
  onInput: (value: string) => void;
  onMode: (mode: string) => void;
  onNavigate: (page: PageId) => void;
  onSend: () => void;
  onStopVoice: () => void;
  onVoice: () => void;
  provider: string;
  safeMode: boolean;
  voiceAgent: ReturnType<typeof useVoiceAgent>;
}) {
  const voiceReady = voiceAgent.status?.fallbackActive ? "Browser fallback active" : `${voiceAgent.status?.ttsProvider ?? "Voice"} active`;
  const statusText = voiceAgent.error || voiceStateLabel[voiceAgent.orbState] || voiceReady;
  const quickChips: { label: string; page?: PageId; run?: () => void }[] = [
    { label: "Open VS Code", page: "tasks" },
    { label: "Search Files", page: "files" },
    { label: "Summarize File", page: "files" },
    { label: "Plan My Day", run: () => { onInput("Plan my day."); onSend(); } },
    { label: "Coding Agent", page: "projects" },
    { label: "Voice Settings", page: "voice" },
  ];

  return (
    <div className="home-orb-shell mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl flex-col items-center justify-center gap-7 px-2 text-center">
      <div className="relative mt-4">
        <div className="home-orb-halo" />
        <VoiceOrb
          isConnected={desktopReady}
          isVoiceEnabled={voiceAgent.config.volume > 0}
          onClick={voiceAgent.orbState === "speaking" ? onStopVoice : onVoice}
          state={voiceAgent.orbState}
          volumeLevel={voiceAgent.volumeLevel}
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <button onClick={() => onNavigate("voice")} className="outline-none">
          <VoiceStatusPill
            orbState={voiceAgent.orbState}
            voiceboxStatus={voiceAgent.status?.voiceboxConnected ? "connected" : "offline"}
            activeProvider={voiceAgent.status?.activeProvider ?? ""}
          />
        </button>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Brain / Responsive / Agentic / Companion / Engine</p>
        <h1 className="mt-3 font-display text-5xl font-semibold text-white md:text-7xl">B.R.A.C.E</h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-400">
          {statusText}
        </p>
      </div>

      <VoiceControls
        input={input}
        mode={mode}
        onAttach={onAttach}
        onInput={onInput}
        onMode={onMode}
        onNavigate={onNavigate}
        onSend={onSend}
        onStop={onStopVoice}
        onVoice={onVoice}
        orbState={voiceAgent.orbState}
      />

      <div className="flex max-w-3xl flex-wrap justify-center gap-2">
        {quickChips.map((chip) => (
          <button
            className="rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-100"
            key={chip.label}
            onClick={() => (chip.run ? chip.run() : chip.page ? onNavigate(chip.page) : undefined)}
            type="button"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {(voiceAgent.partialTranscript || voiceAgent.transcript) && (
        <div className="max-w-3xl rounded-2xl border border-cyan-300/15 bg-black/20 px-5 py-3 text-sm text-slate-300">
          {voiceAgent.partialTranscript || voiceAgent.transcript}
        </div>
      )}
    </div>
  );
}

function ChatPage({
  apiReady,
  approvals,
  input,
  lastFailedPrompt,
  messages,
  onApprove,
  onAttach,
  onClear,
  onExport,
  onInput,
  onReject,
  onRetry,
  onSend,
  onVoice,
  provider,
}: {
  apiReady: boolean;
  approvals: ApprovalRequest[];
  input: string;
  lastFailedPrompt: string;
  messages: ChatMessage[];
  onApprove: (approvalId: string) => Promise<void>;
  onAttach: () => void;
  onClear: () => void;
  onExport: () => void;
  onInput: (value: string) => void;
  onReject: (approvalId: string) => Promise<void>;
  onRetry: () => void;
  onSend: () => void;
  onVoice: () => void;
  provider: string;
}) {
  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">AI chat</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Agentic console</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge label="Brain check active" tone="green" />
              <StatusBadge label={apiReady ? `Provider: ${provider}` : "Offline"} tone={apiReady ? "purple" : "warn"} />
            </div>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3 p-5">
          <button className="secondary-button" onClick={onClear} type="button">
            <Trash2 size={16} />
            Clear
          </button>
          <button className="secondary-button" onClick={onExport} type="button">
            <Download size={16} />
            Export
          </button>
          {lastFailedPrompt && (
            <button className="primary-button" onClick={onRetry} type="button">
              <RefreshCw size={16} />
              Retry
            </button>
          )}
        </GlassCard>
      </div>

      <GlassCard className="flex min-h-0 flex-1 flex-col p-4">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4">
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
          {approvals.map((approval) => (
            <ApprovalCard approval={approval} key={approval.id} onApprove={onApprove} onReject={onReject} />
          ))}
        </div>
        <div className="mt-4">
          <ChatInput onAttach={onAttach} onChange={onInput} onSend={onSend} onVoice={onVoice} value={input} />
        </div>
      </GlassCard>
    </div>
  );
}

function ApprovalCard({ approval, onApprove, onReject }: { approval: ApprovalRequest; onApprove: (approvalId: string) => Promise<void>; onReject: (approvalId: string) => Promise<void> }) {
  return (
    <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Approval required</p>
          <h2 className="mt-1 font-semibold text-white">{approval.plan.goal}</h2>
          <p className="mt-2 text-amber-100/80">Risk: {approval.riskLevel}. {approval.reason}</p>
        </div>
        <div className="flex gap-2">
          <button className="primary-button" onClick={() => void onApprove(approval.id)} type="button">
            Approve once
          </button>
          <button className="secondary-button" onClick={() => void onReject(approval.id)} type="button">
            Reject
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {approval.plan.steps.map((step) => (
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2" key={step.id}>
            <span className="font-medium text-white">{step.title}</span>
            <span className="ml-2 text-xs text-amber-100/70">{step.tool} · {step.riskLevel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilesPage({
  busy,
  files,
  onAnalyze,
  onDrop,
  onQuestion,
  onSelect,
  question,
  result,
  selectedFile,
  selectedFileId,
  setSelectedFileId,
}: {
  busy: boolean;
  files: DragFile[];
  onAnalyze: (action: "summarize" | "explain" | "key-points" | "question") => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onQuestion: (value: string) => void;
  onSelect: () => void;
  question: string;
  result: string;
  selectedFile?: DragFile;
  selectedFileId: string;
  setSelectedFileId: (value: string) => void;
}) {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <GlassCard
          className="border-dashed p-8 text-center"
          onDragOver={(event: React.DragEvent<HTMLDivElement>) => event.preventDefault()}
          onDrop={onDrop}
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
            <UploadCloud size={28} />
          </div>
          <h1 className="text-3xl font-semibold text-white">Select or drop files</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            B.R.A.C.E reads only files you select. PDF/DOCX/code/text are handled by the desktop bridge; dropped text files work in-place.
          </p>
          <button className="primary-button mt-7" onClick={onSelect} type="button">
            <FolderOpen size={17} />
            Select files
          </button>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex flex-wrap gap-3">
            <button className="secondary-button" disabled={!selectedFile || busy} onClick={() => onAnalyze("summarize")} type="button">
              Summarize
            </button>
            <button className="secondary-button" disabled={!selectedFile || busy} onClick={() => onAnalyze("explain")} type="button">
              Explain
            </button>
            <button className="secondary-button" disabled={!selectedFile || busy} onClick={() => onAnalyze("key-points")} type="button">
              Extract key points
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <input
              className="field-control"
              onChange={(event) => onQuestion(event.target.value)}
              placeholder="Ask a question about the selected file"
              value={question}
            />
            <button className="primary-button" disabled={!selectedFile || busy} onClick={() => onAnalyze("question")} type="button">
              Ask
            </button>
          </div>
          <pre className="mt-5 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-200">
            {busy ? "Working..." : result || "File results will appear here."}
          </pre>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Selected files</p>
        <div className="mt-5 space-y-3">
          {files.length === 0 && <p className="text-sm text-slate-500">No files selected yet.</p>}
          {files.map((file) => (
            <button
              className={[
                "w-full rounded-2xl border p-4 text-left transition",
                file.id === selectedFileId ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/10 bg-white/[0.035] hover:border-cyan-300/25",
              ].join(" ")}
              key={file.id}
              onClick={() => setSelectedFileId(file.id)}
              type="button"
            >
              <p className="text-sm font-medium text-white">{file.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {file.extension} · {niceBytes(file.size)} · {file.source}
              </p>
            </button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function SystemPage({
  busy,
  error,
  info,
  onEnable,
  onRefresh,
  permissionEnabled,
}: {
  busy: boolean;
  error: string;
  info: SystemInfo | null;
  onEnable: () => void;
  onRefresh: () => void;
  permissionEnabled: boolean;
}) {
  if (!permissionEnabled) {
    return (
      <EmptyState
        action="Enable system info"
        icon={Database}
        onAction={onEnable}
        text="B.R.A.C.E needs your permission before reading system telemetry."
        title="System monitor locked"
      />
    );
  }
  const metrics = [
    { label: "CPU", value: info?.cpu ?? 0, detail: "Live CPU sample", icon: Database, tone: "cyan", graph: [12, 24, info?.cpu ?? 0, 31, 22, info?.cpu ?? 0] },
    { label: "RAM", value: info?.ram ?? 0, detail: info?.ramDetail ?? "Loading", icon: Database, tone: "teal", graph: [40, 48, info?.ram ?? 0, 61, info?.ram ?? 0] },
    { label: "Storage", value: info?.storage ?? 0, detail: info?.storageDetail ?? "Loading", icon: FileSearch, tone: "purple", graph: [60, 63, info?.storage ?? 0, info?.storage ?? 0] },
    { label: "Network", value: info?.network ?? 0, detail: info?.networkDetail ?? "Loading", icon: Rocket, tone: "cyan", graph: [10, 15, info?.network ?? 0, 18, 12] },
    { label: "GPU", value: info?.gpu ?? 0, detail: info?.gpuDetail ?? "Loading", icon: Bot, tone: "teal", graph: [0, info?.gpu ?? 0, 0, info?.gpu ?? 0] },
    { label: "Battery", value: info?.battery ?? 100, detail: info?.batteryDetail ?? "Loading", icon: Power, tone: "purple", graph: [90, 91, info?.battery ?? 100, 92] },
  ];
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <GlassCard className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Local PC monitor</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">System telemetry</h1>
          <p className="mt-3 text-slate-400">
            {info ? `${info.os.platform} ${info.os.release} · ${info.os.arch} · ${info.os.hostname}` : "Loading system data..."}
          </p>
        </div>
        <button className="secondary-button" onClick={onRefresh} type="button">
          <RefreshCw className={busy ? "animate-spin" : ""} size={17} />
          Refresh
        </button>
      </GlassCard>
      {error && <p className="rounded-2xl border border-rose-300/25 bg-rose-300/10 p-4 text-rose-100">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <SystemMetricCard key={metric.label} {...metric} />
        ))}
      </div>
    </div>
  );
}

function AgentTasksPage({ approvals, onApprove, onReject, tasks }: { approvals: ApprovalRequest[]; onApprove: (approvalId: string) => Promise<void>; onReject: (approvalId: string) => Promise<void>; tasks: AgentTaskRecord[] }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <GlassCard className="p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Agent runtime</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Plans, approvals, and results</h1>
        <p className="mt-3 text-slate-400">Every agent task keeps its plan, risk level, approval state, outputs, and recovery hint.</p>
      </GlassCard>
      <div className="space-y-4">
        {approvals.map((approval) => (
          <ApprovalCard approval={approval} key={approval.id} onApprove={onApprove} onReject={onReject} />
        ))}
        {tasks.map((task) => (
          <GlassCard className="p-5" key={task.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <StatusBadge label={task.status} tone={task.status === "failed" ? "warn" : task.status === "completed" ? "green" : "cyan"} />
                <h2 className="mt-3 font-semibold text-white">{task.goal}</h2>
                <p className="mt-2 text-sm text-slate-500">{task.intent} · {task.riskLevel}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {task.steps.map((step) => (
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300" key={step.id}>
                  <span className="font-medium text-white">{step.title}</span>
                  <span className="block text-xs text-slate-500">{step.tool} · {step.requiredPermission}</span>
                </div>
              ))}
            </div>
            {task.error && <p className="mt-4 rounded-xl border border-rose-300/25 bg-rose-300/10 p-3 text-sm text-rose-100">{task.error} {task.recovery}</p>}
          </GlassCard>
        ))}
        {tasks.length === 0 && <p className="text-sm text-slate-500">No agent tasks yet. Send a command from Chat.</p>}
      </div>
    </div>
  );
}

function MemoryPage({ memories, query, onDelete, onQuery, onRefresh, onSave }: { memories: MemoryRecord[]; query: string; onDelete: (id: string) => void; onQuery: (value: string) => void; onRefresh: () => void; onSave: () => void }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <GlassCard className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Local memory</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Memory viewer</h1>
        </div>
        <button className="primary-button" onClick={onSave} type="button"><Plus size={17} /> Save memory</button>
      </GlassCard>
      <div className="flex gap-2">
        <input className="field-control" onChange={(event) => onQuery(event.target.value)} placeholder="Search memory" value={query} />
        <button className="secondary-button" onClick={onRefresh} type="button"><Search size={16} /> Search</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {memories.map((memory) => (
          <GlassCard className="p-5" key={memory.id}>
            <StatusBadge label={memory.type} tone="cyan" />
            <h2 className="mt-3 font-semibold text-white">{memory.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{memory.content}</p>
            <button className="secondary-button mt-4" onClick={() => onDelete(memory.id)} type="button"><Trash2 size={15} /> Delete</button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function NotesPage({ notes, query, onCreate, onDelete, onQuery, onRefresh }: { notes: NoteEntry[]; query: string; onCreate: () => void; onDelete: (id: string) => void; onQuery: (value: string) => void; onRefresh: () => void }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <GlassCard className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Notes</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">B.R.A.C.E notes</h1>
        </div>
        <button className="primary-button" onClick={onCreate} type="button"><Plus size={17} /> New note</button>
      </GlassCard>
      <div className="flex gap-2">
        <input className="field-control" onChange={(event) => onQuery(event.target.value)} placeholder="Search notes" value={query} />
        <button className="secondary-button" onClick={onRefresh} type="button"><Search size={16} /> Search</button>
      </div>
      <div className="space-y-3">
        {notes.map((note) => (
          <GlassCard className="flex items-center justify-between gap-4 p-4" key={note.id}>
            <div>
              <h2 className="font-semibold text-white">{note.name}</h2>
              <p className="mt-1 break-all text-xs text-slate-500">{note.path}</p>
            </div>
            <button className="icon-button" onClick={() => onDelete(note.id)} title="Delete note" type="button"><Trash2 size={16} /></button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function ToolsPage({ onRefresh, tools }: { onRefresh: () => void; tools: ToolDefinition[] }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <GlassCard className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Tool registry</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Available tools</h1>
        </div>
        <button className="secondary-button" onClick={onRefresh} type="button"><RefreshCw size={16} /> Refresh</button>
      </GlassCard>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <GlassCard className="p-5" key={tool.name}>
            <StatusBadge label={tool.riskLevel} tone={tool.riskLevel === "high" ? "warn" : "cyan"} />
            <h2 className="mt-3 font-semibold text-white">{tool.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{tool.description}</p>
            <p className="mt-3 text-xs text-slate-500">Permission: {tool.requiredPermission} · Dry run: {tool.supportsDryRun ? "yes" : "no"}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function ProjectsPage({ onAdd, onRefresh, projects }: { onAdd: () => void; onRefresh: () => void; projects: ProjectInfo[] }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <GlassCard className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Coding projects</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Project workspace memory</h1>
        </div>
        <div className="flex gap-2">
          <button className="secondary-button" onClick={onRefresh} type="button"><RefreshCw size={16} /> Refresh</button>
          <button className="primary-button" onClick={onAdd} type="button"><Plus size={17} /> Add path</button>
        </div>
      </GlassCard>
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <GlassCard className="p-5" key={project.path}>
            <StatusBadge label={project.type} tone="purple" />
            <h2 className="mt-3 font-semibold text-white">{project.name}</h2>
            <p className="mt-2 break-all text-xs text-slate-500">{project.path}</p>
            <p className="mt-4 text-sm text-slate-400">Scripts: {Object.keys(project.scripts || {}).join(", ") || "none detected"}</p>
            <p className="mt-2 text-sm text-slate-500">Git: {project.git?.isRepo ? project.git.status || "clean" : "not a repo"}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function TasksPage({
  addTask,
  onRun,
  output,
  saveTasks,
  tasks,
}: {
  addTask: () => void;
  onRun: (task: AssistantTask) => void;
  output: string;
  saveTasks: (tasks: AssistantTask[]) => Promise<void>;
  tasks: AssistantTask[];
}) {
  const updateTask = (task: AssistantTask) => saveTasks(tasks.map((item) => (item.id === task.id ? task : item)));
  const deleteTask = (taskId: string) => saveTasks(tasks.filter((task) => task.id !== taskId));
  const editTask = (task: AssistantTask) => {
    const title = window.prompt("Task title", task.title) ?? task.title;
    const detail = window.prompt("Task detail", task.detail) ?? task.detail;
    const type = (window.prompt(
      "Task type: open-vscode, open-folder, open-url, launch-app, focus-timer, clean-folder",
      task.type,
    ) ?? task.type) as AssistantTask["type"];
    void updateTask({ ...task, title, detail, type });
  };
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <GlassCard className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Automation</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Task command center</h1>
          <p className="mt-3 text-slate-400">Actions are allowlisted and require confirmation unless trusted.</p>
        </div>
        <button className="primary-button" onClick={addTask} type="button">
          <Plus size={17} />
          Add task
        </button>
      </GlassCard>
      <div className="grid gap-4 lg:grid-cols-2">
        {tasks.map((task) => (
          <GlassCard className="p-5" interactive key={task.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <ListChecks className="text-cyan-200" size={20} />
                  <h2 className="font-semibold text-white">{task.title}</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">{task.detail}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-600">{task.type}</p>
              </div>
              <button className="icon-button" onClick={() => onRun(task)} title="Run task" type="button">
                <Play size={18} />
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <ToggleMini label="Enabled" value={task.enabled} onClick={() => updateTask({ ...task, enabled: !task.enabled })} />
              <ToggleMini label="Trusted" value={task.trusted} onClick={() => updateTask({ ...task, trusted: !task.trusted })} />
              <button className="secondary-button" onClick={() => editTask(task)} type="button">
                <Edit3 size={15} />
                Edit
              </button>
              <button className="secondary-button" onClick={() => deleteTask(task.id)} type="button">
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
      {output && <GlassCard className="p-5 text-sm text-slate-300">Last output: {output}</GlassCard>}
    </div>
  );
}

function AppsPage({ apps, onAdd, onDelete, onLaunch }: { apps: AppLauncherEntry[]; onAdd: () => void; onDelete: (id: string) => void; onLaunch: (app: AppLauncherEntry) => void }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <GlassCard className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">App launcher</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Controlled local launcher</h1>
          <p className="mt-3 text-slate-400">Add apps manually by selecting an executable. Nothing is scanned automatically.</p>
        </div>
        <button className="primary-button" onClick={onAdd} type="button">
          <Plus size={17} />
          Add app
        </button>
      </GlassCard>
      <div className="grid gap-4 md:grid-cols-2">
        {apps.map((app) => (
          <GlassCard className="p-5" key={app.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-white">{app.name}</h2>
                <p className="mt-2 break-all text-xs text-slate-500">{app.path}</p>
              </div>
              <button className="icon-button" onClick={() => onLaunch(app)} title="Launch app" type="button">
                <Rocket size={18} />
              </button>
            </div>
            <button className="secondary-button mt-5" onClick={() => onDelete(app.id)} type="button">
              <Trash2 size={15} />
              Remove
            </button>
          </GlassCard>
        ))}
        {apps.length === 0 && <EmptyState icon={Rocket} title="No apps added" text="Add an executable path manually to launch it later." action="Add app" onAction={onAdd} />}
      </div>
    </div>
  );
}

function PermissionsPage({ onToggle, permissions }: { onToggle: (name: string, enabled: boolean) => Promise<void>; permissions: PermissionsMap }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <GlassCard className="p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Permissions</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Access control</h1>
        <p className="mt-3 text-slate-400">Every local capability is explicit, revocable, and logged.</p>
      </GlassCard>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(permissions).map(([name, permission]) => (
          <GlassCard className="p-5" key={name}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-white">{permission.label}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{permission.description}</p>
                <p className="mt-3 text-xs text-slate-600">Last used: {permission.lastUsed ? new Date(permission.lastUsed).toLocaleString() : "Never"}</p>
              </div>
              <button className={["toggle-pill", permission.enabled ? "toggle-pill-on" : ""].join(" ")} onClick={() => void onToggle(name, !permission.enabled)} type="button">
                <span />
              </button>
            </div>
            {permission.enabled && (
              <button className="secondary-button mt-4" onClick={() => void onToggle(name, false)} type="button">
                Revoke
              </button>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function LogsPage({ logs, onClear, onRefresh }: { logs: LogEntry[]; onClear: () => void; onRefresh: () => void }) {
  const copyLog = async (entry: LogEntry) => navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <GlassCard className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Audit trail</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Logs and debugging</h1>
        </div>
        <div className="flex gap-2">
          <button className="secondary-button" onClick={onRefresh} type="button">
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="secondary-button" onClick={onClear} type="button">
            <Trash2 size={16} />
            Clear
          </button>
        </div>
      </GlassCard>
      <div className="space-y-3">
        {logs.map((entry) => (
          <GlassCard className="p-4" key={entry.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={entry.type} tone={entry.type === "error" ? "warn" : "cyan"} />
                  <span className="text-xs text-slate-500">{new Date(entry.time).toLocaleString()}</span>
                </div>
                <p className="mt-3 text-sm text-slate-200">{entry.message}</p>
              </div>
              <button className="icon-button" onClick={() => void copyLog(entry)} title="Copy log" type="button">
                <Copy size={16} />
              </button>
            </div>
          </GlassCard>
        ))}
        {logs.length === 0 && <p className="text-sm text-slate-500">No logs yet.</p>}
      </div>
    </div>
  );
}

function SettingsPage({
  clearAllData,
  clearSecret,
  saveSecret,
  secretDrafts,
  secretStatus,
  setSecretDrafts,
  settings,
  updateSettings,
}: {
  clearAllData: () => void;
  clearSecret: (key: "geminiKey" | "openAiApiKey") => Promise<void>;
  saveSecret: (key: "geminiKey" | "openAiApiKey", value: string) => Promise<void>;
  secretDrafts: { geminiKey: string; openAiApiKey: string };
  secretStatus: string;
  setSecretDrafts: (value: { geminiKey: string; openAiApiKey: string }) => void;
  settings: SettingsState;
  updateSettings: (patch: Partial<SettingsState>) => Promise<void>;
}) {
  const setHotkey = (name: string, value: string) => updateSettings({ hotkeys: { ...settings.hotkeys, [name]: value } });
  return (
    <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <GlassCard className="p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Local assistant configuration</h1>
          <p className="mt-3 max-w-3xl text-slate-400">Settings are saved locally. No hidden network requests are made.</p>
        </GlassCard>

        <div className="grid gap-4 md:grid-cols-2">
          <SettingSection icon={Bot} title="AI provider">
            <select className="field-control" onChange={(event) => void updateSettings({ aiProvider: event.target.value as SettingsState["aiProvider"] })} value={settings.aiProvider}>
              <option value="gemini">Gemini</option>
              <option value="ollama">Ollama</option>
              <option value="openai">OpenAI-compatible</option>
              <option value="openrouter">OpenRouter-compatible</option>
              <option value="lmstudio">LM Studio</option>
              <option value="custom">Custom/local endpoint</option>
            </select>
            <TextField label="Model name" value={settings.model ?? ""} onChange={(model) => void updateSettings({ model })} />
            <RangeField label="Temperature" value={settings.temperature ?? 0.35} min={0} max={1.5} step={0.05} onChange={(temperature) => void updateSettings({ temperature })} />
            <TextField label="Max tokens" value={String(settings.maxTokens ?? 1200)} onChange={(maxTokens) => void updateSettings({ maxTokens: Number(maxTokens) || 1200 })} />
            <ApiKeyField
              apiKey={secretDrafts.geminiKey}
              isSaved={settings.geminiKey === "__saved__"}
              onChange={(geminiKey) => setSecretDrafts({ ...secretDrafts, geminiKey })}
              onClear={() => void clearSecret("geminiKey")}
              onSave={() => void saveSecret("geminiKey", secretDrafts.geminiKey)}
              saveStatus={secretStatus}
            />
            <button className="secondary-button" onClick={async () => {
              try {
                const result = await window.braceDesktop?.testAi();
                window.alert(JSON.stringify(result, null, 2));
              } catch (error) {
                window.alert(error instanceof Error ? error.message : "Connection test failed.");
              }
            }} type="button">
              Test connection
            </button>
          </SettingSection>

          <SettingSection icon={Database} title="Endpoints">
            <TextField label="Ollama endpoint" value={settings.ollamaEndpoint} onChange={(ollamaEndpoint) => void updateSettings({ ollamaEndpoint })} />
            <TextField label="Ollama model" value={settings.ollamaModel} onChange={(ollamaModel) => void updateSettings({ ollamaModel })} />
            <TextField label="OpenAI-compatible URL" value={settings.openAiBaseUrl} onChange={(openAiBaseUrl) => void updateSettings({ openAiBaseUrl })} />
            <TextField label="OpenAI-compatible model" value={settings.openAiModel} onChange={(openAiModel) => void updateSettings({ openAiModel })} />
            <label className="block text-sm text-slate-400">
              OpenAI-compatible API key
              <input
                className="field-control mt-2"
                onChange={(event) => setSecretDrafts({ ...secretDrafts, openAiApiKey: event.target.value })}
                placeholder={settings.openAiApiKey === "__saved__" ? "Saved locally" : "Optional key"}
                type="password"
                value={secretDrafts.openAiApiKey}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="primary-button" onClick={() => void saveSecret("openAiApiKey", secretDrafts.openAiApiKey)} type="button">
                Save OpenAI key
              </button>
              <button className="secondary-button" onClick={() => void clearSecret("openAiApiKey")} type="button">
                Clear
              </button>
            </div>
            <TextField label="Custom endpoint" value={settings.customEndpoint} onChange={(customEndpoint) => void updateSettings({ customEndpoint })} />
            <TextField label="Base URL" value={settings.baseUrl ?? ""} onChange={(baseUrl) => void updateSettings({ baseUrl })} />
          </SettingSection>

          <SettingSection icon={Mic} title="Voice">
            <SettingsToggle checked={settings.wakeWord} description="Strip B.R.A.C.E wake word before sending." label="Wake word" onChange={() => void updateSettings({ wakeWord: !settings.wakeWord })} />
            <SettingsToggle checked={settings.voiceOutput} description="Speak assistant responses with local TTS." label="Text-to-speech" onChange={() => void updateSettings({ voiceOutput: !settings.voiceOutput })} />
            <RangeField label="Voice rate" value={settings.voiceRate} min={0.6} max={1.6} step={0.1} onChange={(voiceRate) => void updateSettings({ voiceRate })} />
            <RangeField label="Voice pitch" value={settings.voicePitch} min={0.6} max={1.6} step={0.1} onChange={(voicePitch) => void updateSettings({ voicePitch })} />
          </SettingSection>

          <SettingSection icon={Keyboard} title="Hotkeys">
            {Object.entries(settings.hotkeys).map(([name, value]) => (
              <TextField key={name} label={name} value={value} onChange={(next) => void setHotkey(name, next)} />
            ))}
          </SettingSection>

          <SettingSection icon={Shield} title="Privacy and safety">
            <SettingsToggle checked={settings.offlineMode} description="Block external AI calls." label="Offline Mode" onChange={() => void updateSettings({ offlineMode: !settings.offlineMode })} />
            <SettingsToggle checked={settings.localMode ?? true} description="Prefer local providers and vault memory." label="Local Mode" onChange={() => void updateSettings({ localMode: !(settings.localMode ?? true) })} />
            <SettingsToggle checked={settings.streaming ?? false} description="Show streaming tokens when the provider supports it." label="Streaming" onChange={() => void updateSettings({ streaming: !(settings.streaming ?? false) })} />
            <SettingsToggle checked={settings.safeMode} description="Block risky cleanup actions." label="Safe Mode" onChange={() => void updateSettings({ safeMode: !settings.safeMode })} />
            <SettingsToggle
              checked={settings.adminMode}
              description="Does not bypass UAC. Specific actions must still request elevation."
              label="Admin Mode"
              onChange={() => {
                if (!settings.adminMode && !window.confirm("Admin Mode is advanced. It will not bypass UAC and should stay off unless a specific action needs it. Continue?")) return;
                void updateSettings({ adminMode: !settings.adminMode });
              }}
            />
          </SettingSection>
        </div>
      </div>

      <div className="space-y-6">
        <SettingSection icon={EyeOff} title="Danger Zone">
          <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
            Advanced actions require explicit confirmation. B.R.A.C.E does not install hidden services, bypass UAC, or run unrestricted shell commands.
          </div>
          <button className="secondary-button border-rose-300/30 text-rose-100" onClick={clearAllData} type="button">
            <Trash2 size={16} />
            Clear all local data
          </button>
        </SettingSection>
      </div>
    </div>
  );
}

function CommandPalette({
  items,
  onClose,
  open,
  query,
  setQuery,
}: {
  items: { label: string; run: () => void }[];
  onClose: () => void;
  open: boolean;
  query: string;
  setQuery: (value: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/60 p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto mt-20 max-w-2xl rounded-3xl border border-cyan-300/20 bg-slate-950/95 p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
          <Search size={18} className="text-cyan-200" />
          <input className="flex-1 bg-transparent text-white outline-none" autoFocus onChange={(event) => setQuery(event.target.value)} placeholder="Search actions, pages, apps..." value={query} />
          <button className="icon-button" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 max-h-96 overflow-auto">
          {items.map((item) => (
            <button
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-slate-300 transition hover:bg-cyan-300/10 hover:text-cyan-100"
              key={item.label}
              onClick={() => {
                item.run();
                onClose();
              }}
              type="button"
            >
              <Clipboard size={16} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ action, icon, onAction, text, title }: { action: string; icon: ElementType; onAction: () => void; text: string; title: string }) {
  const Icon = icon;
  return (
    <GlassCard className="mx-auto mt-20 max-w-xl p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
        <Icon size={28} />
      </div>
      <h1 className="mt-6 text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-3 text-slate-400">{text}</p>
      <button className="primary-button mt-6" onClick={onAction} type="button">
        {action}
      </button>
    </GlassCard>
  );
}

function SettingSection({ children, icon, title }: { children: ReactNode; icon: ElementType; title: string }) {
  const Icon = icon;
  return (
    <GlassCard className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-100">
          <Icon size={18} />
        </div>
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      {children}
    </GlassCard>
  );
}

function ToggleMini({ label, onClick, value }: { label: string; onClick: () => void; value: boolean }) {
  return (
    <button className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-300" onClick={onClick} type="button">
      {label}
      <span className={["toggle-pill scale-75", value ? "toggle-pill-on" : ""].join(" ")}>
        <span />
      </span>
    </button>
  );
}

function TextField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block text-sm text-slate-400">
      {label}
      <input className="field-control mt-2" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function RangeField({ label, max, min, onChange, step, value }: { label: string; max: number; min: number; onChange: (value: number) => void; step: number; value: number }) {
  return (
    <label className="block text-sm text-slate-400">
      {label}: {value}
      <input className="mt-2 w-full accent-cyan-300" max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} step={step} type="range" value={value} />
    </label>
  );
}
