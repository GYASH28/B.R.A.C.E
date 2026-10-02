const path = require("node:path");
const { createCodexService } = require("../backend/codex/codexService.cjs");

let state = { codexRuntime: {} };
const stateStore = {
  readState() {
    return structuredClone(state);
  },
  updateState(updater) {
    state = updater(structuredClone(state)) || state;
    return state;
  },
};

const logger = {
  log(type, message) {
    if (process.env.BRACE_SMOKE_VERBOSE === "1") process.stderr.write(`[${type}] ${message}\n`);
  },
};

const service = createCodexService({
  stateStore,
  logger,
  sendEvent: (_channel, payload) => {
    if (process.env.BRACE_SMOKE_VERBOSE === "1" && payload?.type) {
      process.stderr.write(`[event] ${payload.type}\n`);
    }
  },
});

async function main() {
  const status = await service.start();
  if (!status.ready) {
    throw new Error(status.error || "Codex app-server is not ready.");
  }

  const result = await service.run(
    "Reply with exactly BRACE_CODEX_OK and nothing else.",
    {
      cwd: path.resolve(__dirname, ".."),
      profile: "FAST",
      workspaceWrite: false,
      timeoutMs: 120000,
    },
  );

  const text = String(result.text || "").trim();
  if (!text.includes("BRACE_CODEX_OK")) {
    throw new Error(`Unexpected Codex smoke response: ${text || "<empty>"}`);
  }

  process.stdout.write(`✅ Codex app-server smoke passed · ${result.model || "default model"} · ${result.effort || "default effort"}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`❌ Codex smoke failed: ${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await service.stop().catch(() => {});
  });
