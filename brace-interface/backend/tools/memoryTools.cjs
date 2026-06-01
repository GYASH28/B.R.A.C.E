function remember(memoryManager, payload) {
  return memoryManager.saveMemory({ ...payload, approved: true });
}

function searchMemory(memoryManager, query) {
  return memoryManager.searchMemories(query);
}

module.exports = { remember, searchMemory };
