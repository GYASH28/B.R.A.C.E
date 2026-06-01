const fs = require("node:fs");
const path = require("node:path");

const CATEGORY_EXTENSIONS = {
  Images: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".heic"],
  Videos: [".mp4", ".mov", ".avi", ".mkv", ".webm", ".wmv"],
  PDFs: [".pdf"],
  Documents: [".doc", ".docx", ".txt", ".md", ".rtf", ".odt", ".ppt", ".pptx", ".xls", ".xlsx", ".csv"],
  Archives: [".zip", ".rar", ".7z", ".tar", ".gz"],
  Installers: [".exe", ".msi", ".dmg", ".pkg", ".deb", ".rpm"],
  Code: [".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".c", ".cpp", ".cs", ".go", ".rs", ".html", ".css", ".json", ".yml", ".yaml", ".ps1", ".bat"],
  Audio: [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"],
  Shortcuts: [".lnk", ".url", ".webloc"],
};

function categorizeFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  for (const [category, extensions] of Object.entries(CATEGORY_EXTENSIONS)) {
    if (extensions.includes(ext)) return category;
  }
  return "Others";
}

function scanFolderForOrganization(folderPath) {
  const files = fs.readdirSync(folderPath, { withFileTypes: true }).filter((entry) => entry.isFile());
  const moves = files.map((entry) => {
    const category = categorizeFile(entry.name);
    return {
      fileName: entry.name,
      category,
      from: path.join(folderPath, entry.name),
      to: path.join(folderPath, category, entry.name),
    };
  }).filter((move) => path.dirname(move.from) !== path.dirname(move.to));
  return { folderPath, count: moves.length, moves };
}

function executeOrganization(plan) {
  const completed = [];
  for (const move of plan.moves || []) {
    fs.mkdirSync(path.dirname(move.to), { recursive: true });
    if (fs.existsSync(move.to)) {
      const parsed = path.parse(move.to);
      move.to = path.join(parsed.dir, `${parsed.name}-${Date.now()}${parsed.ext}`);
    }
    fs.renameSync(move.from, move.to);
    completed.push(move);
  }
  const undoPath = path.join(plan.folderPath, ".brace-organize-undo.json");
  fs.writeFileSync(undoPath, JSON.stringify({ createdAt: new Date().toISOString(), moves: completed.map((move) => ({ from: move.to, to: move.from })) }, null, 2), "utf8");
  return { ok: true, moved: completed.length, undoPath };
}

function undoOrganization(folderPath) {
  const undoPath = path.join(folderPath, ".brace-organize-undo.json");
  if (!fs.existsSync(undoPath)) throw new Error("No organizer undo file found.");
  const undo = JSON.parse(fs.readFileSync(undoPath, "utf8"));
  let moved = 0;
  for (const move of undo.moves || []) {
    if (!fs.existsSync(move.from)) continue;
    fs.mkdirSync(path.dirname(move.to), { recursive: true });
    fs.renameSync(move.from, move.to);
    moved += 1;
  }
  return { ok: true, moved };
}

module.exports = { CATEGORY_EXTENSIONS, categorizeFile, executeOrganization, scanFolderForOrganization, undoOrganization };
