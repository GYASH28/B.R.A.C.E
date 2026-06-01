const fs = require("node:fs");
const path = require("node:path");
const { normalizeMemory } = require("./memorySchema.cjs");
const { redactSecrets } = require("../security/secretScanner.cjs");

function createMemoryManager({ memoryDir }) {
  const filePath = path.join(memoryDir, "memoryStore.json");

  function ensure() {
    fs.mkdirSync(memoryDir, { recursive: true });
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]", "utf8");
  }

  function listMemories() {
    ensure();
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      const corruptPath = `${filePath}.corrupt-${Date.now()}`;
      if (fs.existsSync(filePath)) fs.renameSync(filePath, corruptPath);
      fs.writeFileSync(filePath, "[]", "utf8");
      return [];
    }
  }

  function writeMemories(memories) {
    ensure();
    fs.writeFileSync(filePath, JSON.stringify(memories, null, 2), "utf8");
  }

  function saveMemory(input) {
    if (!input.approved) throw new Error("Memory save requires user approval.");
    const memory = normalizeMemory({ ...input, content: redactSecrets(input.content || "") });
    const memories = listMemories();
    const next = [memory, ...memories.filter((item) => item.id !== memory.id)];
    writeMemories(next);
    return memory;
  }

  function searchMemories(query) {
    const terms = String(query || "").toLowerCase().split(/\W+/).filter(Boolean);
    if (terms.length === 0) return listMemories();
    return listMemories().filter((memory) => {
      const haystack = `${memory.title} ${memory.content} ${(memory.tags || []).join(" ")}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }

  function updateMemory(id, patch) {
    const memories = listMemories();
    const index = memories.findIndex((memory) => memory.id === id);
    if (index < 0) throw new Error("Memory not found.");
    memories[index] = normalizeMemory({ ...memories[index], ...patch, id, content: redactSecrets(patch.content ?? memories[index].content), approved: true });
    writeMemories(memories);
    return memories[index];
  }

  function deleteMemory(id) {
    const memories = listMemories();
    writeMemories(memories.filter((memory) => memory.id !== id));
    return { ok: true };
  }

  function clearMemories() {
    writeMemories([]);
    return { ok: true };
  }

  return { filePath, listMemories, saveMemory, searchMemories, updateMemory, deleteMemory, clearMemories };
}

module.exports = { createMemoryManager };
