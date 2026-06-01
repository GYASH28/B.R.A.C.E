function saveAiOutputAsNote(noteManager, { title, content, topic }) {
  return noteManager.createNote({ title, content, topic });
}

module.exports = { saveAiOutputAsNote };
