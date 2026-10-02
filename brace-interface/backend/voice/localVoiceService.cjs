const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");
const { spawn } = require("node:child_process");

function createLocalVoiceService({
  userDataPath,
  logger,
  sendEvent = () => {},
  spawnFn = spawn,
  workerPath = process.env.BRACE_VOICE_WORKER || path.resolve(__dirname, "..", "..", "scripts", "voice", "brace_voice_worker.py"),
  pythonBin = process.env.BRACE_VOICE_PYTHON || path.join(os.homedir(), ".local", "share", "brace", "voice", ".venv", "bin", "python"),
} = {}) {
  let child = null;
  let reader = null;
  let sequence = 1;
  let starting = null;
  let ready = false;
  let deps = null;
  let lastError = "";
  const pending = new Map();
  const tempDir = path.join(userDataPath, "voice-temp");

  function pythonCommand() {
    if (fs.existsSync(pythonBin)) return pythonBin;
    return process.platform === "win32" ? "python" : "python3";
  }

  function publicStatus() {
    return {
      ready,
      running: Boolean(child && !child.killed),
      workerPath,
      python: pythonCommand(),
      dependencies: deps,
      error: lastError || null,
      voice: "bm_george",
      sttModel: process.env.BRACE_WHISPER_MODEL || "base.en",
    };
  }

  function emitStatus() {
    sendEvent("brace:local-voice-status", publicStatus());
  }

  function rejectPending(error) {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    pending.clear();
  }

  function write(message) {
    if (!child?.stdin?.writable) throw new Error("Local voice worker is not running.");
    child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  function request(method, params = {}, timeout = 120_000) {
    const id = sequence++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(String(id));
        reject(new Error(`Local voice request timed out: ${method}`));
      }, timeout);
      pending.set(String(id), { resolve, reject, timer });
      try {
        write({ id, method, params });
      } catch (error) {
        clearTimeout(timer);
        pending.delete(String(id));
        reject(error);
      }
    });
  }

  function handleLine(line) {
    const trimmed = String(line || "").trim();
    if (!trimmed) return;
    let message;
    try {
      message = JSON.parse(trimmed);
    } catch {
      return;
    }

    if (message.type === "ready") {
      ready = true;
      deps = message.dependencies || null;
      lastError = "";
      emitStatus();
      return;
    }

    if (message.type === "event") {
      sendEvent("brace:local-voice-event", message);
      return;
    }

    if (message.id !== undefined) {
      const entry = pending.get(String(message.id));
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(String(message.id));
      if (message.error) entry.reject(new Error(String(message.error)));
      else entry.resolve(message.result);
    }
  }

  async function start() {
    if (ready && child && !child.killed) return publicStatus();
    if (starting) return starting;

    starting = new Promise((resolve, reject) => {
      if (!fs.existsSync(workerPath)) {
        reject(new Error(`Local voice worker not found: ${workerPath}`));
        return;
      }

      fs.mkdirSync(tempDir, { recursive: true });
      child = spawnFn(pythonCommand(), ["-u", workerPath], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
        windowsHide: true,
      });

      const timeout = setTimeout(() => {
        reject(new Error("Local voice worker did not become ready."));
      }, 12_000);

      child.on("error", (error) => {
        clearTimeout(timeout);
        lastError = error.message;
        ready = false;
        emitStatus();
        reject(error);
      });

      child.on("exit", (code, signal) => {
        ready = false;
        child = null;
        reader?.close?.();
        reader = null;
        const error = new Error(`Local voice worker exited (${code ?? "?"}${signal ? `, ${signal}` : ""}).`);
        rejectPending(error);
        lastError = error.message;
        emitStatus();
      });

      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr = `${stderr} ${String(chunk)}`.slice(-1800);
        if (stderr.trim()) lastError = stderr.trim();
      });

      reader = readline.createInterface({ input: child.stdout });
      reader.on("line", (line) => {
        const wasReady = ready;
        handleLine(line);
        if (!wasReady && ready) {
          clearTimeout(timeout);
          logger?.log?.("voice", "Local voice worker ready.", { dependencies: deps }, "low");
          resolve(publicStatus());
        }
      });
    });

    try {
      return await starting;
    } finally {
      starting = null;
    }
  }

  async function status() {
    try {
      await start();
      const result = await request("status", {}, 10_000);
      deps = result?.dependencies || deps;
    } catch (error) {
      lastError = error.message;
    }
    emitStatus();
    return publicStatus();
  }

  async function warm() {
    await start();
    const result = await request("warm", { voice: "bm_george" }, 180_000);
    deps = result?.dependencies || deps;
    emitStatus();
    return { ok: true, ...result };
  }

  async function transcribeBytes({ bytes, mimeType = "audio/webm", language = "en" }) {
    await start();
    if (!bytes) throw new Error("Audio payload is empty.");
    const buffer = Buffer.from(bytes);
    if (!buffer.length || buffer.length > 30 * 1024 * 1024) throw new Error("Audio payload size is invalid.");
    const extension = mimeType.includes("ogg") ? ".ogg" : mimeType.includes("wav") ? ".wav" : ".webm";
    const filePath = path.join(tempDir, `input-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`);
    fs.writeFileSync(filePath, buffer);
    try {
      const result = await request("transcribe", { path: filePath, language }, 180_000);
      logger?.log?.("voice", "Local transcription completed.", { latencyMs: result?.latencyMs }, "low");
      return { ok: true, ...result };
    } finally {
      fs.rmSync(filePath, { force: true });
    }
  }

  async function synthesize({ text, voice = "bm_george", speed = 1.0 }) {
    await start();
    const clean = String(text || "").trim().slice(0, 2400);
    if (!clean) throw new Error("Nothing to speak.");
    const outputPath = path.join(tempDir, `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
    const result = await request("synthesize", { text: clean, voice, speed, outputPath }, 180_000);
    try {
      const audio = fs.readFileSync(result.path || outputPath);
      logger?.log?.("voice", "Local speech synthesized.", { latencyMs: result?.latencyMs, voice }, "low");
      return {
        ok: true,
        mimeType: "audio/wav",
        audioBase64: audio.toString("base64"),
        latencyMs: result?.latencyMs,
        voice: result?.voice || voice,
      };
    } finally {
      fs.rmSync(result.path || outputPath, { force: true });
    }
  }

  function stop() {
    rejectPending(new Error("Local voice worker stopped."));
    try { reader?.close?.(); } catch {}
    try { child?.kill?.("SIGTERM"); } catch {}
    reader = null;
    child = null;
    ready = false;
    emitStatus();
  }

  return { start, status, warm, transcribeBytes, synthesize, stop };
}

module.exports = { createLocalVoiceService };
