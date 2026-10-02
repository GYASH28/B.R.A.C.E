const assert = require("node:assert/strict");
const test = require("node:test");

test("backend entrypoint loads with all runtime-local modules present", () => {
  const backend = require("../index.cjs");
  assert.equal(typeof backend.createBackend, "function");
});
