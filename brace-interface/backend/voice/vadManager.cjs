function createVadManager(config = {}) {
  return {
    provider: config.vadProvider || "browser-silence",
    minSpeechMs: config.minSpeechMs || 300,
    silenceTimeoutMs: config.silenceTimeoutMs || 900,
    maxRecordingMs: config.maxRecordingMs || 45000,
    sensitivity: config.vadSensitivity || 0.045,
  };
}

module.exports = { createVadManager };
