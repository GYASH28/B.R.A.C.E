const fs = require("node:fs");
const path = require("node:path");
const { scanProject } = require("../projects/projectManager.cjs");

function proposeTextEdit({ filePath, nextContent }) {
  const exists = fs.existsSync(filePath);
  const current = exists ? fs.readFileSync(filePath, "utf8") : "";
  return {
    filePath,
    exists,
    currentPreview: current.slice(0, 2000),
    nextPreview: String(nextContent || "").slice(0, 2000),
    changed: current !== nextContent,
  };
}

function applyTextEdit({ filePath, nextContent }) {
  const backupPath = fs.existsSync(filePath) ? `${filePath}.brace-${Date.now()}.bak` : "";
  if (backupPath) fs.copyFileSync(filePath, backupPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, String(nextContent || ""), "utf8");
  return { ok: true, filePath, backupPath };
}

module.exports = { applyTextEdit, proposeTextEdit, scanProject };
