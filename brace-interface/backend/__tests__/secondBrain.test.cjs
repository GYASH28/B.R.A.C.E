const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createSecondBrainService } = require("../brain/secondBrainService.cjs");

function fakeStateStore(root) {
  let state = { settings: { secondBrainPath: root } };
  return {
    readState: () => structuredClone(state),
    updateState: (fn) => {
      state = fn(structuredClone(state));
      return state;
    },
  };
}

test("Second Brain retrieves only relevant local notes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brace-brain-"));
  fs.mkdirSync(path.join(root, "Projects"), { recursive: true });
  fs.writeFileSync(path.join(root, "Projects", "BRACE.md"), "# BRACE\nUse a minimal orb interface and Codex runtime.", "utf8");
  fs.writeFileSync(path.join(root, "Cooking.md"), "# Dinner\nMake fried chicken.", "utf8");

  const service = createSecondBrainService({
    stateStore: fakeStateStore(root),
    memoryManager: { listMemories: () => [] },
    noteManager: { listNotes: () => [] },
  });

  const result = service.buildContext("What did I decide about the BRACE Codex orb?", { limit: 3 });
  assert.equal(result.count, 1);
  assert.match(result.context, /minimal orb interface/i);
  assert.doesNotMatch(result.context, /fried chicken/i);
});

test("Second Brain redacts secrets before context leaves local retrieval", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brace-brain-secret-"));
  fs.writeFileSync(path.join(root, "keys.md"), "BRACE token api_key=supersecretvalue12345", "utf8");

  const service = createSecondBrainService({
    stateStore: fakeStateStore(root),
    memoryManager: { listMemories: () => [] },
    noteManager: { listNotes: () => [] },
  });

  const result = service.buildContext("BRACE token api key", { limit: 2 });
  assert.match(result.context, /redacted/i);
  assert.doesNotMatch(result.context, /supersecretvalue12345/);
});
