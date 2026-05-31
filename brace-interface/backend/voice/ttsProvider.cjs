/**
 * Determine the active TTS provider based on dependency status and config.
 * Priority: Voicebox → Kokoro → Piper → Edge-TTS → Browser fallback.
 * @param {object} status - Dependency status object
 * @param {object} config - Voice configuration
 * @returns {{ provider: string, ready: boolean, voices?: Array, fallback?: boolean, online?: boolean }}
 */
function getTtsProviderStatus(status, config) {
  // Voicebox is the primary provider when configured
  if (config?.voiceProvider === "voicebox" && status.dependencies?.voicebox) {
    return { provider: "voicebox", ready: true, voices: status.availableVoices, voiceboxProfiles: status.voiceboxProfiles || [] };
  }
  if (status.dependencies?.kokoro) return { provider: "kokoro", ready: true, voices: status.availableVoices };
  if (status.dependencies?.piper) return { provider: "piper", ready: true, voices: status.availableVoices };
  if (config?.onlineVoiceEnabled && status.dependencies?.edgeTts) return { provider: "edge-tts", ready: true, online: true, voices: status.availableVoices };
  return { provider: "browser-fallback", ready: true, fallback: true, voices: status.availableVoices };
}

module.exports = { getTtsProviderStatus };
