const { redactSecrets } = require("../security/secretScanner.cjs");

function createActivityLogger({ stateStore, maxEntries = 500 } = {}) {
  if (!stateStore) throw new Error("Activity logger requires a state store.");

  function log(type, message, detail = {}, riskLevel = "low", result = "success") {
    const entry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: String(type || "activity"),
      message: redactSecrets(String(message || "")),
      detail: redactSecrets(detail || {}),
      riskLevel: String(riskLevel || "low"),
      result: result == null ? null : String(result),
    };

    stateStore.updateState((state) => {
      const current = Array.isArray(state.logs) ? state.logs : [];
      state.logs = [entry, ...current].slice(0, Math.max(1, Number(maxEntries) || 500));
      return state;
    });

    return entry;
  }

  function list(limit = 250) {
    const logs = stateStore.readState().logs;
    return (Array.isArray(logs) ? logs : []).slice(0, Math.max(0, Number(limit) || 0));
  }

  function clear() {
    stateStore.updateState((state) => {
      state.logs = [];
      return state;
    });
    return { ok: true };
  }

  return { log, list, clear };
}

module.exports = { createActivityLogger };
