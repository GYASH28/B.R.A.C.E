const assert = require("node:assert/strict");
const test = require("node:test");

const { detectFastAction } = require("../codex/fastActionService.cjs");

test("fast actions recognize system info without invoking an LLM", () => {
  assert.deepEqual(detectFastAction("show my RAM"), { id: "system.ram", permission: "systemInfo" });
  assert.deepEqual(detectFastAction("what operating system am I running"), { id: "system.os", permission: "systemInfo" });
});

test("fast actions recognize VS Code and common folders", () => {
  assert.equal(detectFastAction("open VS Code").id, "app.vscode");
  assert.equal(detectFastAction("please open my Downloads").id, "folder.downloads");
  assert.equal(detectFastAction("launch Documents").id, "folder.documents");
});

test("fast actions resolve only actually registered arbitrary apps", () => {
  const apps = [{ id: "firefox", name: "Firefox", path: "/usr/bin/firefox" }];
  assert.equal(detectFastAction("open firefox", { apps }).appId, "firefox");
  assert.equal(detectFastAction("open blender", { apps }), null);
});

test("fast actions do not hijack complex coding prompts", () => {
  assert.equal(detectFastAction("open the repository and fix the React build"), null);
  assert.equal(detectFastAction("debug my VS Code extension"), null);
});
