/**
 * Determine the active STT provider based on dependency status and config.
 * Priority: Voicebox → faster-whisper → whisper.cpp → Browser fallback.
 * @param {object} status - Dependency status object
 * @param {object} config - Voice configuration (optional)
 * @returns {{ provider: string, ready: boolean, fallback?: boolean }}
 */
function getSttProviderStatus(status, config) {
  // Voicebox provides built-in Whisper-powered transcription
  if (config?.voiceProvider === "voicebox" && status.dependencies?.voicebox) {
    return { provider: "voicebox", ready: true };
  }
  if (status.dependencies?.fasterWhisper) return { provider: "faster-whisper", ready: true };
  if (status.dependencies?.whisperCpp) return { provider: "whisper.cpp", ready: true };
  return { provider: "browser-fallback", ready: true, fallback: true };
}

module.exports = { getSttProviderStatus };

