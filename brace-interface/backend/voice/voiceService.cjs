const { DEFAULT_VOICE_CONFIG, VOICE_PRESETS, mergeVoiceConfig } = require("./voiceConfig.cjs");
const { getVoiceStatus } = require("./voiceStatus.cjs");

function createVoiceService({ stateStore, logger }) {
  function getConfig() {
    const state = stateStore.readState();
    return mergeVoiceConfig(DEFAULT_VOICE_CONFIG, state.settings?.voice || {});
  }

  function updateConfig(patch = {}) {
    const next = mergeVoiceConfig(getConfig(), patch);
    stateStore.updateState((state) => {
      state.settings = { ...state.settings, voice: next };
      return state;
    });
    logger.log("voice", "Voice config updated", { keys: Object.keys(patch) }, "low");
    return next;
  }

  function status() {
    return getVoiceStatus(getConfig());
  }

  function listVoices() {
    return { voices: VOICE_PRESETS, selectedVoice: getConfig().selectedVoice };
  }

  function logEvent(type, detail = {}) {
    return logger.log("voice", type, detail, detail.riskLevel || "low", detail.result || "ok");
  }

  return { getConfig, listVoices, logEvent, status, updateConfig };
}

module.exports = { createVoiceService };
