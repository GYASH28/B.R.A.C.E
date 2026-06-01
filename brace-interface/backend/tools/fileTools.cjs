const fs = require("node:fs");
const path = require("node:path");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".json", ".js", ".jsx", ".ts", ".tsx", ".py", ".html", ".css", ".scss", ".xml", ".yml", ".yaml", ".log", ".c", ".cpp", ".java", ".ps1", ".bat"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"]);

function metadata(filePath) {
  const stat = fs.statSync(filePath);
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    path: filePath,
    name: path.basename(filePath),
    extension: path.extname(filePath).toLowerCase() || "unknown",
    size: stat.size,
    modified: stat.mtime.toISOString(),
    isDirectory: stat.isDirectory(),
  };
}

async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);
  if (ext === ".pdf") return (await pdfParse(buffer)).text || "";
  if (ext === ".docx") return (await mammoth.extractRawText({ buffer })).value || "";
  if (TEXT_EXTENSIONS.has(ext)) return buffer.toString("utf8");
  if (IMAGE_EXTENSIONS.has(ext)) return "Image selected. OCR is not enabled yet; metadata is available.";
  return buffer.toString("utf8").slice(0, 20000);
}

function summarizeText(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "No readable text was found.";
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  return sentences.slice(0, 5).join(" ").slice(0, 1800);
}

function keyPoints(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 24).slice(0, 10);
  return lines.length ? lines.map((line) => `- ${line.slice(0, 240)}`).join("\n") : `- ${summarizeText(text)}`;
}

function answerQuestion(text, question) {
  const terms = String(question || "").toLowerCase().split(/\W+/).filter((word) => word.length > 3);
  const matches = String(text || "").split(/\r?\n/).filter((line) => terms.some((term) => line.toLowerCase().includes(term))).slice(0, 10);
  return matches.length ? matches.map((line) => `- ${line.trim().slice(0, 280)}`).join("\n") : "I could not find a direct match inside the selected file.";
}

function createBackup(filePath) {
  if (!fs.existsSync(filePath)) throw new Error("Cannot back up a missing file.");
  const backupDir = path.join(path.dirname(filePath), ".brace-backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `${path.basename(filePath)}.${Date.now()}.bak`);
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function listFolder(folderPath) {
  return fs.readdirSync(folderPath, { withFileTypes: true }).map((entry) => {
    const entryPath = path.join(folderPath, entry.name);
    return { ...metadata(entryPath), isDirectory: entry.isDirectory() };
  });
}

function searchFiles({ rootPath, query, maxResults = 50 }) {
  const results = [];
  const needle = String(query || "").toLowerCase();
  function walk(current) {
    if (results.length >= maxResults) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (["node_modules", ".git", "dist", "release", "AppData"].includes(entry.name)) continue;
      const entryPath = path.join(current, entry.name);
      if (entry.name.toLowerCase().includes(needle)) results.push(metadata(entryPath));
      if (entry.isDirectory()) walk(entryPath);
      if (results.length >= maxResults) break;
    }
  }
  walk(rootPath);
  return results;
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function deleteFileToRecycleBin(filePath, shell) {
  if (!fs.existsSync(filePath)) return { ok: true };
  if (!shell?.trashItem) throw new Error("Recycle bin API is unavailable in this runtime.");
  await shell.trashItem(filePath);
  return { ok: true };
}

module.exports = {
  TEXT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  answerQuestion,
  appendFile: (filePath, content) => fs.appendFileSync(filePath, content, "utf8"),
  copyFile: (from, to) => { ensureParent(to); fs.copyFileSync(from, to); return to; },
  createBackup,
  createFile: (filePath, content = "") => { ensureParent(filePath); fs.writeFileSync(filePath, content, { encoding: "utf8", flag: "wx" }); return filePath; },
  createFolder: (folderPath) => { fs.mkdirSync(folderPath, { recursive: true }); return folderPath; },
  deleteFileToRecycleBin,
  extractTextFromFile,
  keyPoints,
  listFolder,
  metadata,
  moveFile: (from, to) => { ensureParent(to); fs.renameSync(from, to); return to; },
  readFile: (filePath) => fs.readFileSync(filePath, "utf8"),
  renameFile: (from, newName) => { const to = path.join(path.dirname(from), newName); fs.renameSync(from, to); return to; },
  searchFiles,
  summarizeFile: async (filePath) => summarizeText(await extractTextFromFile(filePath)),
  summarizeText,
  writeFile: (filePath, content) => { if (fs.existsSync(filePath)) createBackup(filePath); ensureParent(filePath); fs.writeFileSync(filePath, content, "utf8"); return filePath; },
};
