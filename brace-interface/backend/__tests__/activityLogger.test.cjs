const assert = require("node:assert/strict");
const test = require("node:test");

const { createActivityLogger } = require("../logs/activityLogger.cjs");

test("activity logger persists locally and redacts secrets", () => {
  let state = { logs: [] };
  const stateStore = {
    readState: () => structuredClone(state),
    updateState: (updater) => {
      state = updater(structuredClone(state)) || state;
      return state;
    },
  };

  const logger = createActivityLogger({ stateStore, maxEntries: 2 });
  logger.log("test", "token=supersecretvalue", {
    apiKey: "sk-abcdefghijklmnopqrstuvwxyz1234",
  });
  logger.log("test", "second");
  logger.log("test", "third");

  const logs = logger.list();
  assert.equal(logs.length, 2);
  assert.equal(logs[0].message, "third");
  assert.equal(logs[1].message, "second");
  assert.doesNotMatch(JSON.stringify(state), /supersecretvalue/);
  assert.doesNotMatch(JSON.stringify(state), /sk-abcdefghijklmnopqrstuvwxyz1234/);

  logger.clear();
  assert.deepEqual(logger.list(), []);
});
