function buildContext({ state, memoryManager, selectedFile, workspacePath }) {
  const memories = memoryManager.searchMemories("").slice(0, 8);
  const conversation = (state.chatHistory || []).slice(-12);
  return {
    conversation,
    recentConversation: conversation.map((message) => `${String(message.role || "user").toUpperCase()}: ${String(message.text || "")}`).join("\n"),
    selectedFile,
    workspacePath,
    permissions: state.permissions,
    safeFolders: state.settings.safeFolders || [],
    memorySummary: memories.map((memory) => `- ${memory.title}: ${memory.content}`).join("\n"),
  };
}

module.exports = { buildContext };
