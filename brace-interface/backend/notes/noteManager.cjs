const fs = require("node:fs");
const path = require("node:path");
const { redactSecrets } = require("../security/secretScanner.cjs");

function slugify(value) {
  return String(value || "note")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "note";
}

function createNoteManager({ notesDir }) {
  function ensure() {
    fs.mkdirSync(notesDir, { recursive: true });
  }

  function listNotes() {
    ensure();
    return fs.readdirSync(notesDir)
      .filter((name) => name.toLowerCase().endsWith(".md") || name.toLowerCase().endsWith(".txt"))
      .map((name) => {
        const filePath = path.join(notesDir, name);
        const stat = fs.statSync(filePath);
        return { id: name, name, path: filePath, size: stat.size, modified: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.modified.localeCompare(a.modified));
  }

  function createNote({ title, content, topic = "general" }) {
    ensure();
    const stamp = new Date().toISOString().slice(0, 10);
    const name = `${stamp}-${slugify(title)}.md`;
    const filePath = path.join(notesDir, name);
    if (fs.existsSync(filePath)) throw new Error("A note with this generated name already exists.");
    const body = [`# ${title || "B.R.A.C.E Note"}`, "", `Topic: ${topic}`, `Created: ${new Date().toISOString()}`, "", redactSecrets(content || "")].join("\n");
    fs.writeFileSync(filePath, body, "utf8");
    return { id: name, name, path: filePath, content: body };
  }

  function readNote(id) {
    ensure();
    const filePath = path.join(notesDir, path.basename(id));
    if (!fs.existsSync(filePath)) throw new Error("Note not found.");
    return { id: path.basename(filePath), path: filePath, content: fs.readFileSync(filePath, "utf8") };
  }

  function updateNote(id, content) {
    ensure();
    const filePath = path.join(notesDir, path.basename(id));
    if (!fs.existsSync(filePath)) throw new Error("Note not found.");
    fs.writeFileSync(filePath, redactSecrets(content || ""), "utf8");
    return readNote(id);
  }

  function deleteNote(id, shell) {
    const filePath = path.join(notesDir, path.basename(id));
    if (!fs.existsSync(filePath)) return { ok: true };
    if (shell?.trashItem) return shell.trashItem(filePath).then(() => ({ ok: true }));
    fs.renameSync(filePath, `${filePath}.deleted-${Date.now()}`);
    return { ok: true };
  }

  function searchNotes(query) {
    const term = String(query || "").toLowerCase();
    return listNotes().filter((note) => !term || note.name.toLowerCase().includes(term) || fs.readFileSync(note.path, "utf8").toLowerCase().includes(term));
  }

  return { notesDir, listNotes, createNote, readNote, updateNote, deleteNote, searchNotes };
}

module.exports = { createNoteManager };
