function kokoroSetup() {
  return {
    provider: "kokoro",
    installCommand: "python -m pip install kokoro soundfile",
    note: "Kokoro is the preferred local TTS provider when installed.",
  };
}

module.exports = { kokoroSetup };
