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

function getVoiceDependencyStatus(config = {}) {
  const python = commandExists("python", ["--version"]);
  const fasterWhisper = python && pythonImport("faster_whisper");
  const edgeTts = python && pythonImport("edge_tts");
  const kokoro = python && pythonImport("kokoro");
  const piperCli = commandExists("piper", ["--help"]);
  const whisperCpp = commandExists("whisper-cli", ["--help"]) || commandExists("main", ["--help"]);

  return {
    python,
    fasterWhisper,
    whisperCpp,
    kokoro,
    piper: piperCli || modelPathExists(config.piperModelPath),
    edgeTts,
    sileroVad: python && (pythonImport("silero_vad") || pythonImport("onnxruntime")),
    browserFallback: true,
  };
}

function chooseActiveProviders(config = {}) {
  const deps = getVoiceDependencyStatus(config);
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
    setup,
    errors: [],
  };
}

module.exports = { chooseActiveProviders, commandExists, getVoiceDependencyStatus, getVoiceStatus };
