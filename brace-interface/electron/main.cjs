const { app, BrowserWindow, Menu, dialog, globalShortcut, ipcMain, nativeTheme, safeStorage, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { createBackend } = require("../backend/index.cjs");
const { startLocalServer } = require("./localServer.cjs");

const isDev = !app.isPackaged;
let mainWindow = null;
let backend = null;
let localServer = null;

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
  handle("permissions:update", ({ name, enabled }) => handlers.updatePermission(name, enabled));
  handle("logs:list", handlers.logsList);
  handle("logs:clear", handlers.logsClear);
  handle("chat:list", handlers.chatList);
  handle("chat:save", handlers.chatSave);
  handle("chat:clear", handlers.chatClear);
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
  handle("codex:status", handlers.codexStatus);
  handle("codex:run", handlers.codexRun);
  handle("codex:interrupt", handlers.codexInterrupt);
  handle("codex:new-thread", handlers.codexNewThread);
  handle("codex:approval", handlers.codexApproval);
  handle("brain:status", handlers.secondBrainStatus);
  handle("brain:search", handlers.secondBrainSearch);
  handle("brain:select", handlers.secondBrainSelect);
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
  handle("voice-local:status", handlers.localVoiceStatus);
  handle("voice-local:warm", handlers.localVoiceWarm);
  handle("voice-local:transcribe", handlers.localVoiceTranscribe);
  handle("voice-local:synthesize", handlers.localVoiceSynthesize);
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

async function runVisualSmokeIfRequested() {
  if (process.env.BRACE_VISUAL_SMOKE !== "1" || !mainWindow) return;

  const screenshotPath = path.resolve(
    process.env.BRACE_VISUAL_SCREENSHOT ||
      path.join(__dirname, "..", "artifacts", "brace-shell-smoke.png"),
  );

  try {
    mainWindow.show();
    mainWindow.setFullScreen(true);
    await new Promise((resolve) => setTimeout(resolve, 650));

    const deadline = Date.now() + 15000;
    let ready = false;
    while (Date.now() < deadline) {
      ready = await mainWindow.webContents.executeJavaScript(
        'Boolean(document.querySelector(".brace-shell") && document.querySelector(".brace-orb") && document.querySelector(".brace-composer"))',
        true,
      );
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    if (!ready) throw new Error("Fresh shell, orb, or composer did not render.");

    const metrics = await mainWindow.webContents.executeJavaScript(`(() => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const value = node.getBoundingClientRect();
        return { x: value.x, y: value.y, width: value.width, height: value.height };
      };
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        shell: rect(".brace-shell"),
        orb: rect(".brace-orb"),
        composer: rect(".brace-composer"),
        hasPermanentSidebar: Boolean(document.querySelector("aside, nav")),
        bodyOverflow: getComputedStyle(document.body).overflow,
      };
    })()`, true);

    if (!metrics.shell || !metrics.orb || !metrics.composer) {
      throw new Error("Required fresh-shell elements are missing.");
    }
    if (metrics.hasPermanentSidebar) {
      throw new Error("A permanent sidebar/nav rendered in the fresh shell.");
    }

    const orbCenter = metrics.orb.x + metrics.orb.width / 2;
    const viewportCenter = metrics.width / 2;
    if (Math.abs(orbCenter - viewportCenter) > Math.max(40, metrics.width * 0.04)) {
      throw new Error(`Orb is not horizontally centered: ${JSON.stringify(metrics)}`);
    }

    if (
      metrics.composer.x < 0 ||
      metrics.composer.y < 0 ||
      metrics.composer.x + metrics.composer.width > metrics.width + 1 ||
      metrics.composer.y + metrics.composer.height > metrics.height + 1
    ) {
      throw new Error(`Composer is clipped: ${JSON.stringify(metrics)}`);
    }

    if (metrics.bodyOverflow !== "hidden") {
      throw new Error(`Desktop shell should not page-scroll: ${JSON.stringify(metrics)}`);
    }

    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    const image = await mainWindow.webContents.capturePage();
    fs.writeFileSync(screenshotPath, image.toPNG());
    console.log(`BRACE_VISUAL_OK ${metrics.width}x${metrics.height} ${screenshotPath}`);
    app.exit(0);
  } catch (error) {
    console.error(`BRACE_VISUAL_FAIL ${error.message}`);
    app.exit(1);
  }
}

async function createWindow() {
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
  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.setFullScreen(true);
    mainWindow.show();
  });

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11") {
      event.preventDefault();
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      return;
    }
    if (input.key === "Escape" && mainWindow.isFullScreen()) {
      event.preventDefault();
      mainWindow.setFullScreen(false);
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const distDir = path.join(__dirname, "..", "dist");
    const local = await startLocalServer({ distDir, preferredPort: 4317 });
    localServer = local.server;
    await mainWindow.loadURL(`http://127.0.0.1:${local.port}`);
  }

  await runVisualSmokeIfRequested();
}

app.whenReady().then(async () => {
  backend = createBackend({ app, dialog, safeStorage, shell, mainWindow: currentWindow });
  backend.ensureState();
  registerIpc();
  await createWindow();
  registerHotkeys();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  localServer?.close();
  void backend?.codexService?.stop?.();
  backend?.localVoiceService?.stop?.();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
