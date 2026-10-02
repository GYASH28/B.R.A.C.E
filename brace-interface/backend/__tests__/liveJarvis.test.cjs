const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { AGENTS } = require("../agents/catalog.cjs");
const { routeTask } = require("../agents/modelRouter.cjs");
const { findRelevantSkills } = require("../skills/skillRegistry.cjs");
const { createLiveSession } = require("../live/liveSession.cjs");
const { classifyIntent } = require("../agent/intentClassifier.cjs");
const { callOpenAIResponses } = require("../ai/openaiResponses.cjs");
const { createSecretStore } = require("../security/secretStore.cjs");
const { startLocalServer } = require("../../electron/localServer.cjs");

test("BRACE exposes exactly 17 daily-drive specialist agents", () => {
  assert.equal(AGENTS.length, 17);
  assert.equal(new Set(AGENTS.map((agent) => agent.id)).size, 17);
});

test("normal work stays on Luna high while deep architecture escalates", () => {
  const simple = routeTask("Plan my afternoon and sort these priorities.");
  assert.equal(simple.model, "gpt-5.6-luna");
  assert.equal(simple.effort, "high");

  const complex = routeTask("Do a deep production architecture audit of this complex backend, including security and root cause analysis.");
  assert.equal(complex.model, "gpt-5.6-sol");
  assert.ok(["high", "xhigh"].includes(complex.effort));
});

test("skill registry discovers and matches Agent Skills SKILL.md packages", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brace-skills-"));
  const skillDir = path.join(root, "react-performance");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), `---
name: React Performance
description: Diagnose React rendering performance and optimize slow component trees.
---

Use profiling before changing component structure.
`, "utf8");

  const matched = findRelevantSkills("Audit this React rendering performance problem", { roots: [root], force: true, limit: 2 });
  assert.ok(matched.some((skill) => skill.name === "React Performance"));
});

test("GPT-Live session creation keeps the key server-side and requests client delegation", async () => {
  const originalFetch = global.fetch;
  let captured;
  global.fetch = async (url, init) => {
    captured = { url, init };
    return {
      ok: true,
      async json() {
        return { session: { id: "live_test" }, transport: { type: "webrtc", sdp: "answer-sdp" } };
      },
    };
  };

  try {
    const result = await createLiveSession(
      { openAiApiKey: "sk-test", liveVoice: "marin" },
      { sdp: "offer-sdp", history: [{ role: "user", text: "Hello" }] },
    );
    assert.equal(result.session.id, "live_test");
    assert.equal(captured.url, "https://api.openai.com/v1/live/sessions");
    assert.match(captured.init.headers.Authorization, /^Bearer /);
    const body = JSON.parse(captured.init.body);
    assert.equal(body.session.model, "gpt-live-1");
    assert.equal(body.session.delegation.type, "client");
    assert.equal(body.transport.type, "webrtc");
    assert.equal(body.transport.sdp, "offer-sdp");
  } finally {
    global.fetch = originalFetch;
  }
});

test("production localhost server serves the built SPA from loopback", async () => {
  const distDir = fs.mkdtempSync(path.join(os.tmpdir(), "brace-dist-"));
  fs.writeFileSync(path.join(distDir, "index.html"), "<!doctype html><title>BRACE TEST</title>", "utf8");
  const { server, port } = await startLocalServer({ distDir, preferredPort: 0 });
  try {
    const response = await fetch(`http://127.0.0.1:${port}/deep/link`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /BRACE TEST/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});


test("research language routes to the research path instead of the old browser stub", () => {
  assert.equal(classifyIntent("Research the latest GPT-Live updates").intent, "research");
  assert.equal(classifyIntent("Search web for current Kubuntu fixes").intent, "research");
});

test("Responses wrapper forwards hosted web-search tools", async () => {
  const originalFetch = global.fetch;
  let captured;
  global.fetch = async (_url, init) => {
    captured = JSON.parse(init.body);
    return {
      ok: true,
      async json() {
        return { id: "resp_test", output_text: "Research complete.", usage: {} };
      },
    };
  };

  try {
    const result = await callOpenAIResponses(
      { openAiApiKey: "sk-test", maxTokens: 1000 },
      "Research this",
      { model: "gpt-5.6-luna", effort: "high", tools: [{ type: "web_search" }] },
    );
    assert.equal(result.text, "Research complete.");
    assert.deepEqual(captured.tools, [{ type: "web_search" }]);
    assert.equal(captured.reasoning.effort, "high");
  } finally {
    global.fetch = originalFetch;
  }
});

test("secret store encrypts API keys when Electron safeStorage is available", () => {
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "brace-secrets-"));
  const fakeSafeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(`encrypted:${value}`, "utf8"),
    decryptString: (buffer) => buffer.toString("utf8").replace(/^encrypted:/, ""),
  };
  const store = createSecretStore({ userDataPath, safeStorage: fakeSafeStorage });
  store.set("openAiApiKey", "sk-secret-value");
  assert.equal(store.has("openAiApiKey"), true);
  assert.equal(store.get("openAiApiKey"), "sk-secret-value");
  const raw = fs.readFileSync(store.secretsPath, "utf8");
  assert.doesNotMatch(raw, /sk-secret-value/);
  assert.match(raw, /safeStorage/);
});
