const assert = require("node:assert/strict");
const test = require("node:test");

const { routeLocalDecision } = require("../codex/localDecisionRouter.cjs");
const { chooseModelForProfile } = require("../codex/codexService.cjs");

test("local decision router keeps simple work fast", () => {
  const result = routeLocalDecision("Open VS Code");
  assert.equal(result.profile, "FAST");
  assert.equal(result.category, "system");
  assert.equal(result.networkAccess, false);
});

test("local decision router escalates deep code audits", () => {
  const result = routeLocalDecision("Do a deep production architecture audit, investigate the root cause, verify security, and refactor the complex Electron backend.");
  assert.equal(result.profile, "DEEP");
  assert.equal(result.category, "coding");
  assert.equal(result.shouldShowAgents, true);
});

test("local decision router enables network only when the request needs it", () => {
  assert.equal(routeLocalDecision("Research the latest Electron release online").networkAccess, true);
  assert.equal(routeLocalDecision("Explain this function").networkAccess, false);
});

test("Codex model selection uses only discovered catalog models", () => {
  const models = [
    { model: "gpt-5.6-luna", displayName: "Luna", hidden: false, isDefault: false, defaultReasoningEffort: "medium", supportedReasoningEfforts: [{ reasoningEffort: "low", description: "" }, { reasoningEffort: "high", description: "" }] },
    { model: "gpt-5.6-terra", displayName: "Terra", hidden: false, isDefault: true, defaultReasoningEffort: "high", supportedReasoningEfforts: [{ reasoningEffort: "medium", description: "" }, { reasoningEffort: "high", description: "" }] },
    { model: "gpt-5.6-sol", displayName: "Sol", hidden: false, isDefault: false, defaultReasoningEffort: "high", supportedReasoningEfforts: [{ reasoningEffort: "high", description: "" }, { reasoningEffort: "xhigh", description: "" }] },
  ];

  assert.equal(chooseModelForProfile(models, "FAST").model, "gpt-5.6-luna");
  assert.equal(chooseModelForProfile(models, "NORMAL").model, "gpt-5.6-terra");
  assert.equal(chooseModelForProfile(models, "DEEP").model, "gpt-5.6-sol");
  assert.equal(chooseModelForProfile(models, "DEEP").effort, "xhigh");
});

test("Codex model selection falls back to the catalog default without inventing a model", () => {
  const models = [
    { model: "codex-current", hidden: false, isDefault: true, defaultReasoningEffort: "medium", supportedReasoningEfforts: [{ reasoningEffort: "medium", description: "" }] },
  ];
  const selected = chooseModelForProfile(models, "DEEP");
  assert.equal(selected.model, "codex-current");
  assert.equal(selected.effort, "medium");
});


test("Codex-native renderer bridge does not expose direct cloud AI or GPT-Live", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const preload = fs.readFileSync(path.resolve(__dirname, "../../electron/preload.cjs"), "utf8");

  assert.match(preload, /codexRun/);
  assert.match(preload, /localVoiceStatus/);
  assert.match(preload, /secondBrainStatus/);
  assert.doesNotMatch(preload, /createLiveSession|runLiveDelegation|settings:save-secret|ai:chat|ai:test/);
});

test("fresh shell stays orb-first without the old permanent constellation", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const app = fs.readFileSync(path.resolve(__dirname, "../../src/App.tsx"), "utf8");

  assert.match(app, /<BraceOrb/);
  assert.match(app, /<BraceComposer/);
  assert.match(app, /<AgentField/);
  assert.doesNotMatch(app, /AgentConstellation|<aside|<nav/);
});

test("Linux package keeps the Python voice worker executable outside ASAR", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf8"));

  assert.ok(pkg.build.files.includes("scripts/voice/**/*"));
  assert.ok(pkg.build.asarUnpack.includes("scripts/voice/**/*"));
});
