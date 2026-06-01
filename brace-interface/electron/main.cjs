const { app, BrowserWindow, Menu, dialog, globalShortcut, ipcMain, nativeTheme, shell } = require("electron");
const path = require("node:path");
const { createBackend } = require("../backend/index.cjs");

const isDev = !app.isPackaged;
let mainWindow = null;
let backend = null;

function currentWindow() {
  return mainWindow;
}

function handle(channel, handler) {
  ipcMain.handle(channel, async (_event, payload) => handler(payload));
}

function registerIpc() {
  const handlers = backend.handlers;
  handle("state:get", handlers.state);
  handle("settings:update", handlers.updateSettings);
  handle("settings:save-secret", handlers.saveSecret);
  handle("permissions:update", ({ name, enabled }) => handlers.updatePermission(name, enabled));
  handle("logs:list", handlers.logsList);
  handle("logs:clear", handlers.logsClear);
  handle("chat:list", handlers.chatList);
  handle("chat:save", handlers.chatSave);
  handle("chat:clear", handlers.chatClear);
  handle("ai:chat", handlers.askAi);
  handle("ai:test", handlers.aiTest);
  handle("system:get", handlers.systemInfo);
  handle("files:select", handlers.selectFiles);
  handle("folders:select", handlers.selectFolder);
  handle("files:analyze", handlers.analyzeFile);
  handle("tasks:list", handlers.tasksList);
  handle("tasks:save", handlers.tasksSave);
  handle("tasks:run", handlers.tasksRun);
  handle("apps:list", handlers.appsList);
  handle("apps:add", handlers.appsAdd);
  handle("apps:delete", handlers.appsDelete);
  handle("apps:launch", handlers.appsLaunch);
  handle("data:clear-all", handlers.clearAllData);
  handle("agent:run", handlers.agentRun);
  handle("agent:approve", handlers.agentApprove);
  handle("agent:reject", handlers.agentReject);
  handle("agent:cancel", handlers.agentCancel);
  handle("agent:list", handlers.agentList);
  handle("tools:list", handlers.toolsList);
  handle("tools:dry-run", handlers.toolsDryRun);
  handle("memory:list", handlers.memoryList);
  handle("memory:search", handlers.memorySearch);
  handle("memory:save", handlers.memorySave);
  handle("memory:update", handlers.memoryUpdate);
  handle("memory:delete", handlers.memoryDelete);
  handle("notes:list", handlers.notesList);
  handle("notes:search", handlers.notesSearch);
  handle("notes:create", handlers.notesCreate);
  handle("notes:read", handlers.notesRead);
  handle("notes:update", handlers.notesUpdate);
  handle("notes:delete", handlers.notesDelete);
  handle("projects:list", handlers.projectsList);
  handle("projects:add", handlers.projectsAdd);
  handle("projects:scan", handlers.projectsScan);
  handle("voice:status", handlers.voiceStatus);
  handle("voice:config:get", handlers.voiceConfigGet);
  handle("voice:config:update", handlers.voiceConfigUpdate);
  handle("voice:voices", handlers.voiceVoices);
  handle("voice:log", handlers.voiceLog);
}

function registerHotkeys() {
  globalShortcut.unregisterAll();
  const settings = backend.stateStore.readState().settings;
  const pairs = [
    ["openAssistant", settings.hotkeys?.openAssistant],
    ["startVoice", settings.hotkeys?.startVoice],
    ["mute", settings.hotkeys?.mute],
    ["commandPalette", settings.hotkeys?.commandPalette],
  ];
  for (const [name, accelerator] of pairs) {
    if (!accelerator) continue;
    try {
      globalShortcut.register(accelerator, () => {
        if (!mainWindow) return;
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send("brace:hotkey", name);
      });
    } catch (error) {
      backend.logger.log("error", `Failed to register hotkey: ${accelerator}`, { name, error: error.message }, "low", "error");
    }
  }
}

function createWindow() {
  nativeTheme.themeSource = "dark";
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1120,
    minHeight: 760,
    title: "B.R.A.C.E",
    backgroundColor: "#050914",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  backend = createBackend({ app, dialog, shell, mainWindow: currentWindow });
  backend.ensureState();
  registerIpc();
  createWindow();
  registerHotkeys();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
