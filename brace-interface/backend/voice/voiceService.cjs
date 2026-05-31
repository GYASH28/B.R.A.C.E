const { DEFAULT_VOICE_CONFIG, VOICE_PRESETS, mergeVoiceConfig } = require("./voiceConfig.cjs");
const { getVoiceStatus } = require("./voiceStatus.cjs");
const { VoiceboxClient } = require("./voiceboxClient.cjs");

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

  function getClient() {
    const config = getConfig();
    const url = config.voiceboxBaseUrl || process.env.VOICEBOX_BASE_URL || "http://127.0.0.1:17493";
    const profile = config.voiceboxDefaultProfile || process.env.VOICEBOX_DEFAULT_PROFILE || "";
    return new VoiceboxClient({ baseUrl: url, defaultProfile: profile });
  }

  async function status() {
    const client = getClient();
    const config = getConfig();
    const voiceboxStatus = await client.status();
    const baseStatus = getVoiceStatus(config);
    
    baseStatus.voiceboxConnected = voiceboxStatus.ok;
    baseStatus.dependencies.voicebox = voiceboxStatus.ok;

    // Direct provider assignment based on status and settings
    if (config.voiceProvider === "voicebox" && voiceboxStatus.ok) {
      baseStatus.ttsProvider = "voicebox";
      baseStatus.sttProvider = "voicebox";
      baseStatus.fallbackActive = false;
    } else {
      baseStatus.ttsProvider = "browser-fallback";
      baseStatus.sttProvider = "browser-fallback";
      baseStatus.fallbackActive = true;
    }
    baseStatus.activeProvider = baseStatus.ttsProvider;
    return baseStatus;
  }

  function listVoices() {
    return { voices: VOICE_PRESETS, selectedVoice: getConfig().selectedVoice };
  }

  function logEvent(type, detail = {}) {
    return logger.log("voice", type, detail, detail.riskLevel || "low", detail.result || "ok");
  }

  // Speak endpoint delegation
  async function speak(text, options = {}) {
    const client = getClient();
    return client.speak(text, options);
  }

  // Transcribe endpoint delegation
  async function transcribe(audioBuffer, options = {}) {
    const client = getClient();
    return client.transcribe(audioBuffer, options);
  }

  // Fetch Voicebox profiles
  async function profiles() {
    const client = getClient();
    return client.profiles();
  }

  // Test integration
  async function test() {
    const client = getClient();
    return client.test();
  }

  return { 
    getConfig, 
    listVoices, 
    logEvent, 
    status, 
    updateConfig,
    speak,
    transcribe,
    profiles,
    test
  };
}

module.exports = { createVoiceService };
