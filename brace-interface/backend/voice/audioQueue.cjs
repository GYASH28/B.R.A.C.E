function createAudioQueue() {
  let currentId = "";
  return {
    nextId() {
      currentId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      return currentId;
    },
    cancel() {
      currentId = "";
      return { ok: true };
    },
    isCurrent(id) {
      return Boolean(id && id === currentId);
    },
  };
}

module.exports = { createAudioQueue };
