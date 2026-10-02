const assert = require("node:assert/strict");
const test = require("node:test");
const { EventEmitter } = require("node:events");

const { openVSCode } = require("../tools/appTools.cjs");

function fakeChild(event, value) {
  const child = new EventEmitter();
  child.unref = () => {};
  queueMicrotask(() => child.emit(event, value));
  return child;
}

test("VS Code uses the configured binary first on Linux", async () => {
  const calls = [];
  const shell = {
    openExternal: async (url) => calls.push(["uri", url]),
  };
  const spawnFn = (command, args) => {
    calls.push(["spawn", command, args]);
    return fakeChild("spawn");
  };

  const result = await openVSCode({
    folderPath: "/tmp/brace project",
    shell,
    appPath: "/usr/bin/code",
    platform: "linux",
    spawnFn,
  });

  assert.equal(result.method, "binary");
  assert.equal(calls[0][0], "spawn");
  assert.equal(calls[0][1], "/usr/bin/code");
  assert.equal(calls[0][2][0], "/tmp/brace project");
  assert.equal(calls.some((entry) => entry[0] === "uri"), false);
});

test("VS Code falls back to vscode URI when the Linux binary cannot launch", async () => {
  const calls = [];
  const shell = {
    openExternal: async (url) => calls.push(["uri", url]),
  };
  const spawnFn = () => fakeChild("error", new Error("ENOENT"));

  const result = await openVSCode({
    folderPath: "/tmp/brace",
    shell,
    appPath: "missing-code",
    platform: "linux",
    spawnFn,
  });

  assert.equal(result.method, "uri");
  assert.equal(calls.length, 1);
  assert.match(calls[0][1], /^vscode:\/\/file\//);
});
