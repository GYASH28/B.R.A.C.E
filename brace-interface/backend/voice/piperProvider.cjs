function piperSetup() {
  return {
    provider: "piper",
    installCommand: "Install Piper CLI and set a voice model path in voice config.",
    note: "Piper is the fast local fallback provider.",
  };
}

module.exports = { piperSetup };
