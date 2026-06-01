const fs = require("node:fs");
const path = require("node:path");
const { defaultState } = require("./defaultConfig.cjs");

function createStateStore({ userDataPath }) {
  const statePath = path.join(userDataPath, "brace-local-state.json");

  function readState() {
    if (!fs.existsSync(statePath)) {
      const fresh = defaultState();
      writeState(fresh);
      return fresh;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(statePath, "utf8"));
      const base = defaultState();
      return {
        ...base,
        ...parsed,
        settings: { ...base.settings, ...(parsed.settings ?? {}) },
        permissions: { ...base.permissions, ...(parsed.permissions ?? {}) },
        tasks: parsed.tasks ?? base.tasks,
        apps: parsed.apps ?? base.apps,
        chatHistory: parsed.chatHistory ?? [],
        logs: parsed.logs ?? [],
        agentTasks: parsed.agentTasks ?? [],
        approvals: parsed.approvals ?? [],
        recentCommands: parsed.recentCommands ?? [],
        recentToolCalls: parsed.recentToolCalls ?? [],
      };
    } catch {
      const fresh = defaultState();
      writeState(fresh);
      return fresh;
    }
  }

  function writeState(state) {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
  }

  function updateState(updater) {
    const state = readState();
    const next = updater(state) || state;
    writeState(next);
    return next;
  }

  return { statePath, readState, writeState, updateState };
}

module.exports = { createStateStore };
