function getSttProviderStatus(status) {
  if (status.dependencies?.fasterWhisper) return { provider: "faster-whisper", ready: true };
  if (status.dependencies?.whisperCpp) return { provider: "whisper.cpp", ready: true };
  return { provider: "browser-fallback", ready: true, fallback: true };
}

module.exports = { getSttProviderStatus };
