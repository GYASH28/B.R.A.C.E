function getTtsProviderStatus(status, config) {
  if (status.dependencies?.kokoro) return { provider: "kokoro", ready: true, voices: status.availableVoices };
  if (status.dependencies?.piper) return { provider: "piper", ready: true, voices: status.availableVoices };
  if (config?.onlineVoiceEnabled && status.dependencies?.edgeTts) return { provider: "edge-tts", ready: true, online: true, voices: status.availableVoices };
  return { provider: "browser-fallback", ready: true, fallback: true, voices: status.availableVoices };
}

module.exports = { getTtsProviderStatus };
