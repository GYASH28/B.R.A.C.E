function whisperSetup() {
  return {
    provider: "faster-whisper",
    installCommand: "python -m pip install faster-whisper",
    note: "faster-whisper is preferred for local speech recognition.",
  };
}

module.exports = { whisperSetup };
