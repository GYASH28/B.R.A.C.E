const MEMORY_TYPES = ["preference", "project", "tool", "routine", "conversation"];

function normalizeMemory(input) {
  const now = new Date().toISOString();
  return {
    id: input.id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    type: MEMORY_TYPES.includes(input.type) ? input.type : "conversation",
    title: String(input.title || "Untitled memory").slice(0, 160),
    content: String(input.content || "").slice(0, 8000),
    tags: Array.isArray(input.tags) ? input.tags.map(String).slice(0, 12) : [],
    approved: Boolean(input.approved),
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}

module.exports = { MEMORY_TYPES, normalizeMemory };
