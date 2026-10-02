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


test("fast action service asks once then executes locally after permission is granted", async () => {
  const { createFastActionService } = require("../codex/fastActionService.cjs");

  let state = {
    settings: {},
    apps: [],
    permissions: {
      systemInfo: {
        label: "System info",
        description: "Read local system information.",
        riskLevel: "low",
        enabled: false,
        lastUsed: null,
      },
    },
  };
  const stateStore = {
    readState: () => structuredClone(state),
    writeState: (next) => { state = structuredClone(next); },
  };
  const service = createFastActionService({
    stateStore,
    shell: {},
    logger: { log() {} },
  });

  const first = await service.tryRun({ command: "show my RAM" });
  assert.equal(first.handled, true);
  assert.equal(first.mode, "permission");
  assert.equal(first.permissionRequired.name, "systemInfo");

  state.permissions.systemInfo.enabled = true;
  const second = await service.tryRun({ command: "show my RAM" });
  assert.equal(second.handled, true);
  assert.equal(second.direct, true);
  assert.equal(second.mode, "direct");
  assert.match(second.text, /^RAM:/);
});
