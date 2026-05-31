const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { VOICE_PRESETS } = require("./voiceConfig.cjs");

function commandExists(command, args = ["--version"]) {
  try {
    execFileSync(command, args, { encoding: "utf8", stdio: "pipe", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function pythonImport(moduleName) {
  try {
    execFileSync("python", ["-c", `import ${moduleName}; print("ok")`], { encoding: "utf8", stdio: "pipe", timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

function modelPathExists(value) {
  return Boolean(value && fs.existsSync(value));
}

/**
 * Check if Voicebox is running and reachable.
 * @param {string} baseUrl - Voicebox base URL (default: http://127.0.0.1:17493)
 * @returns {{ running: boolean, profiles?: Array, error?: string }}
 */
function checkVoicebox(baseUrl = "http://127.0.0.1:17493") {
  try {
    const http = require("node:http");
    const url = new URL("/profiles", baseUrl);
    return new Promise((resolve) => {
      const req = http.get(url, { timeout: 3000 }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const profiles = JSON.parse(data);
            resolve({ running: true, profiles: Array.isArray(profiles) ? profiles : [] });
          } catch {
            resolve({ running: true, profiles: [] });
          }
        });
      });
      req.on("error", () => resolve({ running: false, error: "Voicebox not reachable" }));
      req.on("timeout", () => { req.destroy(); resolve({ running: false, error: "Voicebox timed out" }); });
    });
  } catch {
    return Promise.resolve({ running: false, error: "Failed to check Voicebox" });
  }
}

/**
 * Synchronous check for Voicebox (for use in status builders).
 * Uses a quick TCP probe instead of full HTTP request.
 */
function checkVoiceboxSync(baseUrl = "http://127.0.0.1:17493") {
  try {
    const { execFileSync: exec } = require("node:child_process");
    const url = new URL(baseUrl);
    const port = url.port || 17493;
    exec("node", ["-e", `
      const net = require("net");
      const s = net.connect(${port}, "127.0.0.1");
      s.on("connect", () => { s.destroy(); process.exit(0); });
      s.on("error", () => process.exit(1));
      setTimeout(() => process.exit(1), 2000);
    `], { timeout: 4000, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function getVoiceDependencyStatus(config = {}) {
  const python = commandExists("python", ["--version"]);
  const fasterWhisper = python && pythonImport("faster_whisper");
  const edgeTts = python && pythonImport("edge_tts");
  const kokoro = python && pythonImport("kokoro");
  const piperCli = commandExists("piper", ["--help"]);
  const whisperCpp = commandExists("whisper-cli", ["--help"]) || commandExists("main", ["--help"]);

  // Check Voicebox connectivity
  const voiceboxUrl = config.voiceboxBaseUrl || process.env.VOICEBOX_BASE_URL || "http://127.0.0.1:17493";
  const voicebox = checkVoiceboxSync(voiceboxUrl);

  return {
    python,
    fasterWhisper,
    whisperCpp,
    kokoro,
    piper: piperCli || modelPathExists(config.piperModelPath),
    edgeTts,
    sileroVad: python && (pythonImport("silero_vad") || pythonImport("onnxruntime")),
    voicebox,
    browserFallback: true,
  };
}

function chooseActiveProviders(config = {}) {
  const deps = getVoiceDependencyStatus(config);

  // Voicebox is the preferred provider when available
  if (config.voiceProvider === "voicebox" && deps.voicebox) {
    return { sttProvider: "voicebox", ttsProvider: "voicebox", vadProvider: "browser-silence", fallbackActive: false, voiceboxConnected: true };
  }

  if (config.mode === "online-high-quality" && config.onlineVoiceEnabled && deps.edgeTts) {
    return { sttProvider: "browser-fallback", ttsProvider: "edge-tts", vadProvider: "browser-silence", fallbackActive: false };
  }
  if (config.mode === "best-local" && deps.fasterWhisper && deps.kokoro && deps.sileroVad) {
    return { sttProvider: "faster-whisper", ttsProvider: "kokoro", vadProvider: "silero", fallbackActive: false };
  }
  if (config.mode !== "browser-fallback" && (deps.fasterWhisper || deps.whisperCpp) && deps.piper) {
    return { sttProvider: deps.fasterWhisper ? "faster-whisper" : "whisper.cpp", ttsProvider: "piper", vadProvider: deps.sileroVad ? "silero" : "browser-silence", fallbackActive: false };
  }
  return { sttProvider: "browser-fallback", ttsProvider: "browser-fallback", vadProvider: "browser-silence", fallbackActive: true };
}

function getVoiceStatus(config = {}) {
  const dependencies = getVoiceDependencyStatus(config);
  const active = chooseActiveProviders(config);
  const setup = [];
  if (!dependencies.voicebox) setup.push("Install Voicebox from https://voicebox.sh or start the Voicebox app.");
  if (!dependencies.kokoro) setup.push("Install Kokoro: python -m pip install kokoro soundfile");
  if (!dependencies.fasterWhisper) setup.push("Install faster-whisper: python -m pip install faster-whisper");
  if (!dependencies.piper) setup.push("Install Piper or set a Piper model path.");
  if (!dependencies.sileroVad) setup.push("Install Silero VAD support: python -m pip install silero-vad onnxruntime");
  return {
    ok: true,
    mode: config.mode,
    ...active,
    dependencies,
    availableVoices: VOICE_PRESETS,
    selectedVoice: config.selectedVoice || "brace-default",
    voiceboxConnected: dependencies.voicebox,
    activeProvider: active.ttsProvider,
    setup,
    errors: [],
  };
}

module.exports = { checkVoicebox, checkVoiceboxSync, chooseActiveProviders, commandExists, getVoiceDependencyStatus, getVoiceStatus };
