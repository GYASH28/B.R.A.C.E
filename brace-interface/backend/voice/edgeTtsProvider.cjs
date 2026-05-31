function edgeTtsSetup() {
  return {
    provider: "edge-tts",
    installCommand: "python -m pip install edge-tts",
    note: "edge-tts is online and only used when Online High Quality mode is enabled.",
  };
}

module.exports = { edgeTtsSetup };
