function buildContext({ state, memoryManager, selectedFile, workspacePath }) {
  const memories = memoryManager.searchMemories("").slice(0, 8);
  return {
    conversation: (state.chatHistory || []).slice(-12),
    selectedFile,
    workspacePath,
    permissions: state.permissions,
    safeFolders: state.settings.safeFolders || [],
    memorySummary: memories.map((memory) => `- ${memory.title}: ${memory.content}`).join("\n"),
  };
}

module.exports = { buildContext };
