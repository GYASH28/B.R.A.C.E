const fs = require("node:fs");
const path = require("node:path");
const { createAgentRuntime } = require("./agent/agentRuntime.cjs");
const { createApprovalManager } = require("./agent/approvalManager.cjs");
const { createExecutor } = require("./agent/executor.cjs");
const { createTaskStateManager } = require("./agent/taskStateManager.cjs");
const { testConnection, callProvider } = require("./ai/providerRouter.cjs");
const { DATA_DIR_NAME, VAULT_PATH, defaultState } = require("./config/defaultConfig.cjs");
const { createStateStore } = require("./config/stateStore.cjs");
const { createActivityLogger } = require("./logs/activityLogger.cjs");
const { createMemoryManager } = require("./memory/memoryManager.cjs");
const { createNoteManager } = require("./notes/noteManager.cjs");
const { scanProject } = require("./projects/projectManager.cjs");
const { createPathGuard } = require("./security/pathGuard.cjs");
const { requirePermission, touchPermission } = require("./security/permissionManager.cjs");
const { createToolRegistry } = require("./tools/toolRegistry.cjs");
const { createToolRouter } = require("./tools/toolRouter.cjs");
const fileTools = require("./tools/fileTools.cjs");
const folderTools = require("./tools/folderTools.cjs");
const appTools = require("./tools/appTools.cjs");
const systemTools = require("./tools/systemTools.cjs");
const { createVoiceService } = require("./voice/voiceService.cjs");
const { GitNexusService } = require("./gitnexus/gitnexusService.cjs");

function cryptoId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function publicState(state) {
  return {
    ...state,
    settings: {
      ...state.settings,
      apiKey: state.settings.apiKey ? "__saved__" : "",
      geminiKey: state.settings.geminiKey ? "__saved__" : "",
      openAiApiKey: state.settings.openAiApiKey ? "__saved__" : "",
    },
  };
}

function createBackend({ app, dialog, shell, mainWindow }) {
  const userDataPath = app.getPath("userData");
  const vaultDataDir = path.join(VAULT_PATH, DATA_DIR_NAME);
  const stateStore = createStateStore({ userDataPath });
  const logger = createActivityLogger({ stateStore });
  const memoryManager = createMemoryManager({ memoryDir: path.join(vaultDataDir, "memory") });
  const noteManager = createNoteManager({ notesDir: path.join(vaultDataDir, "notes") });
  const voiceService = createVoiceService({ stateStore, logger });
  const gitnexusService = new GitNexusService({ stateStore, logger, pathGuard });

  const safeRoots = stateStore.readState().settings.safeFolders || [VAULT_PATH];
  const pathGuard = createPathGuard({ safeRoots });
  const toolRegistry = createToolRegistry({ shell });
  const toolRouter = createToolRouter(toolRegistry);
  const taskState = createTaskStateManager({ stateStore });
  const approvals = createApprovalManager({ stateStore });
  const executor = createExecutor({ toolRouter, stateStore, memoryManager, logger, pathGuard });
  const sendEvent = (channel, payload) => mainWindow()?.webContents?.send(channel, payload);
  const agentRuntime = createAgentRuntime({ stateStore, memoryManager, logger, taskState, approvals, executor, sendEvent });

  function ensureState() {
    const state = stateStore.readState();
    if (!state.version) stateStore.writeState({ ...defaultState(), ...state, version: 2 });
    return stateStore.readState();
  }

  function updatePermission(name, enabled) {
    const state = stateStore.readState();
    if (!state.permissions[name]) throw new Error(`Unknown permission: ${name}`);
    state.permissions[name].enabled = Boolean(enabled);
    if (enabled) state.permissions[name].lastUsed = new Date().toISOString();
    stateStore.writeState(state);
    logger.log("permission", `${state.permissions[name].label} ${enabled ? "enabled" : "disabled"}`);
    return state.permissions;
  }

  async function selectFiles() {
    const state = stateStore.readState();
    requirePermission(state, "files");
    const result = await dialog.showOpenDialog({
      title: "Select files for B.R.A.C.E",
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Supported files", extensions: ["txt", "md", "pdf", "docx", "csv", "json", "js", "jsx", "ts", "tsx", "py", "html", "css", "png", "jpg", "jpeg", "svg"] },
        { name: "All files", extensions: ["*"] },
      ],
    });
    if (result.canceled) return { ok: true, files: [] };
    touchPermission(state, "files");
    stateStore.writeState(state);
    logger.log("file", `Selected ${result.filePaths.length} file(s)`);
    return { ok: true, files: result.filePaths.map(fileTools.metadata) };
  }

  async function selectFolder() {
    const state = stateStore.readState();
    requirePermission(state, "folders");
    const result = await dialog.showOpenDialog({ title: "Select a folder for B.R.A.C.E", properties: ["openDirectory"] });
    if (result.canceled) return { ok: true, folderPath: "" };
    touchPermission(state, "folders");
    stateStore.writeState(state);
    logger.log("folder", "Folder selected", { folderPath: result.filePaths[0] });
    return { ok: true, folderPath: result.filePaths[0] };
  }

  async function analyzeFile({ filePath, action, question }) {
    const state = stateStore.readState();
    requirePermission(state, "files");
    const resolved = path.resolve(filePath);
    const decision = pathGuard.isAllowed(resolved, { userSelected: true });
    if (!decision.allowed) throw new Error(decision.reason);
    if (!fs.existsSync(resolved)) throw new Error("Selected file does not exist.");
    const text = await fileTools.extractTextFromFile(resolved);
    let result = "";
    if (action === "summarize") result = fileTools.summarizeText(text);
    else if (action === "explain") result = `Simple explanation:\n${fileTools.summarizeText(text)}\n\nKey points:\n${fileTools.keyPoints(text)}`;
    else if (action === "key-points") result = fileTools.keyPoints(text);
    else if (action === "question") result = fileTools.answerQuestion(text, question);
    else throw new Error(`Unsupported file action: ${action}`);
    touchPermission(state, "files");
    stateStore.writeState(state);
    logger.log("file", `File action completed: ${action}`, { file: path.basename(resolved) });
    return { ok: true, result, metadata: fileTools.metadata(resolved) };
  }

  async function runLegacyTask(task) {
    const state = stateStore.readState();
    if (task.type === "open-vscode") {
      requirePermission(state, "appLaunch");
      return (await appTools.openVSCode({ folderPath: task.payload?.folderPath || VAULT_PATH, shell })).message;
    }
    if (task.type === "open-folder") {
      requirePermission(state, "appLaunch");
      return (await appTools.openProjectFolder({ folderPath: task.payload?.folderPath || VAULT_PATH, shell })).message;
    }
    if (task.type === "open-url") {
      requirePermission(state, "appLaunch");
      return (await appTools.openURL({ url: task.payload?.url, shell })).message;
    }
    if (task.type === "launch-app") {
      requirePermission(state, "appLaunch");
      return (await appTools.openSpecificApp({ appPath: task.payload?.appPath, shell })).message;
    }
    if (task.type === "focus-timer") return `Focus timer started for ${Number(task.payload?.minutes || 25)} minutes.`;
    if (task.type === "clean-folder") {
      requirePermission(state, "folders");
      const plan = folderTools.scanFolderForOrganization(task.payload?.folderPath);
      return `Preview ready: ${plan.count} file(s) can be organized. Use the folder organizer approval flow to move them.`;
    }
    throw new Error(`Unsupported task type: ${task.type}`);
  }

  return {
    stateStore,
    logger,
    memoryManager,
    noteManager,
    voiceService,
    taskState,
    approvals,
    agentRuntime,
    toolRouter,
    ensureState,
    handlers: {
      state: () => publicState(ensureState()),
      updateSettings: (patch) => {
        stateStore.updateState((state) => {
          state.settings = { ...state.settings, ...patch };
          return state;
        });
        logger.log("settings", "Settings updated", { keys: Object.keys(patch || {}) });
        return { ok: true };
      },
      saveSecret: ({ key, value }) => {
        if (!["apiKey", "geminiKey", "openAiApiKey"].includes(key)) throw new Error("Unsupported secret key.");
        stateStore.updateState((state) => {
          state.settings[key] = String(value || "").trim();
          return state;
        });
        logger.log("settings", `${key} saved locally`);
        return { ok: true };
      },
      updatePermission,
      logsList: () => logger.list(),
      logsClear: () => logger.clear(),
      chatList: () => stateStore.readState().chatHistory || [],
      chatSave: (messages) => {
        stateStore.updateState((state) => {
          state.chatHistory = Array.isArray(messages) ? messages.slice(-250) : [];
          return state;
        });
        return { ok: true };
      },
      chatClear: () => {
        stateStore.updateState((state) => {
          state.chatHistory = [];
          return state;
        });
        logger.log("chat", "Chat history cleared");
        return { ok: true };
      },
      askAi: async ({ prompt }) => {
        try {
          const result = await callProvider(stateStore.readState().settings, prompt, {});
          logger.log("ai", `AI request completed using ${result.provider}`);
          return { ok: true, text: result.text, provider: result.provider };
        } catch (error) {
          logger.log("error", `AI request failed: ${error.message}`, {}, "medium", "error");
          return { ok: false, error: error.message };
        }
      },
      aiTest: async () => testConnection(stateStore.readState().settings),
      systemInfo: async () => {
        const state = stateStore.readState();
        requirePermission(state, "systemInfo");
        touchPermission(state, "systemInfo");
        stateStore.writeState(state);
        return { ok: true, info: await systemTools.getSystemInfo() };
      },
      selectFiles,
      selectFolder,
      analyzeFile,
      tasksList: () => stateStore.readState().tasks || [],
      tasksSave: (tasks) => {
        stateStore.updateState((state) => {
          state.tasks = Array.isArray(tasks) ? tasks : [];
          return state;
        });
        logger.log("task", "Tasks saved", { count: Array.isArray(tasks) ? tasks.length : 0 });
        return { ok: true };
      },
      tasksRun: async (task) => ({ ok: true, output: await runLegacyTask(task) }),
      appsList: () => stateStore.readState().apps || [],
      appsAdd: async () => {
        const state = stateStore.readState();
        requirePermission(state, "appLaunch");
        const result = await dialog.showOpenDialog({ title: "Select app executable", properties: ["openFile"], filters: [{ name: "Executables", extensions: ["exe", "bat", "cmd"] }] });
        if (result.canceled) return { ok: true, app: null };
        const appEntry = { id: cryptoId(), name: path.basename(result.filePaths[0]), path: result.filePaths[0], trusted: false, addedAt: new Date().toISOString() };
        state.apps = [appEntry, ...(state.apps || [])];
        stateStore.writeState(state);
        logger.log("app", "App launcher entry added", { name: appEntry.name });
        return { ok: true, app: appEntry };
      },
      appsDelete: (id) => {
        stateStore.updateState((state) => {
          state.apps = (state.apps || []).filter((item) => item.id !== id);
          return state;
        });
        logger.log("app", "App launcher entry deleted");
        return { ok: true };
      },
      appsLaunch: async (appEntry) => {
        const state = stateStore.readState();
        requirePermission(state, "appLaunch");
        await appTools.openSpecificApp({ appPath: appEntry.path, shell });
        logger.log("app", "App launched", { name: appEntry.name });
        return { ok: true };
      },
      clearAllData: () => {
        stateStore.writeState(defaultState());
        logger.log("privacy", "Local app data reset");
        return { ok: true };
      },
      agentRun: (payload) => agentRuntime.run(payload),
      agentApprove: ({ approvalId }) => agentRuntime.approve(approvalId),
      agentReject: ({ approvalId }) => agentRuntime.reject(approvalId),
      agentCancel: ({ taskId }) => agentRuntime.cancel(taskId),
      agentList: () => ({ tasks: taskState.listTasks(), approvals: approvals.listApprovals() }),
      toolsList: () => toolRouter.listTools(),
      toolsDryRun: async ({ name, input }) => {
        const tool = toolRouter.getTool(name);
        if (!tool.supportsDryRun) return { ok: false, message: "This tool has no dry run mode." };
        if (name === "folder.organize.preview") return { ok: true, result: folderTools.scanFolderForOrganization(input.folderPath) };
        if (name === "command.explain") return { ok: true, result: await tool.execute(input, {}) };
        return { ok: true, tool: { ...tool, execute: undefined }, input };
      },
      memoryList: () => memoryManager.listMemories(),
      memorySearch: ({ query }) => memoryManager.searchMemories(query),
      memorySave: (payload) => {
        const memory = memoryManager.saveMemory({ ...payload, approved: true });
        logger.log("memory", `Saved memory: ${memory.title}`, { id: memory.id }, "medium");
        return memory;
      },
      memoryUpdate: ({ id, patch }) => memoryManager.updateMemory(id, patch),
      memoryDelete: ({ id }) => memoryManager.deleteMemory(id),
      notesList: () => noteManager.listNotes(),
      notesSearch: ({ query }) => noteManager.searchNotes(query),
      notesCreate: (payload) => noteManager.createNote(payload),
      notesRead: ({ id }) => noteManager.readNote(id),
      notesUpdate: ({ id, content }) => noteManager.updateNote(id, content),
      notesDelete: ({ id }) => noteManager.deleteNote(id, shell),
      projectsScan: ({ projectPath }) => scanProject(projectPath),
      projectsAdd: ({ projectPath }) => {
        const project = scanProject(projectPath);
        stateStore.updateState((state) => {
          state.projects = [project, ...(state.projects || []).filter((item) => item.path !== project.path)];
          return state;
        });
        return project;
      },
      projectsList: () => stateStore.readState().projects || [],
      voiceStatus: () => voiceService.status(),
      voiceConfigGet: () => voiceService.getConfig(),
      voiceConfigUpdate: (patch) => voiceService.updateConfig(patch),
      voiceVoices: () => voiceService.listVoices(),
      voiceLog: ({ type, detail }) => voiceService.logEvent(type || "voice event", detail || {}),
      voiceboxStatus: () => voiceService.status(),
      voiceboxProfiles: () => voiceService.profiles(),
      voiceboxSpeak: ({ text, options }) => voiceService.speak(text, options),
      voiceboxTranscribe: ({ audioBuffer, options }) => voiceService.transcribe(Buffer.from(audioBuffer), options),
      voiceboxTest: () => voiceService.test(),
      voiceboxStop: () => {
        logger.log("voice", "TTS playback stopped by user");
        return { ok: true };
      },
      gitnexusStatus: ({ projectPath }) => gitnexusService.status(projectPath),
      gitnexusIndex: ({ projectPath, mode }) => gitnexusService.index(projectPath, mode),
      gitnexusDocs: ({ projectPath }) => gitnexusService.listDocs(projectPath),
      gitnexusOpenDoc: async ({ filePath }) => {
        const state = stateStore.readState();
        requirePermission(state, "appLaunch");
        const resolved = path.resolve(filePath);
        await shell.openPath(resolved);
        logger.log("gitnexus", `Opened documentation file: ${path.basename(resolved)}`);
        return { ok: true };
      },
    },
  };
}

module.exports = { createBackend };
