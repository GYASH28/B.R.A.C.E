const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

let cache = { at: 0, skills: [] };
const CACHE_MS = 30000;

function cleanYamlValue(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function parseSkill(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    let name = path.basename(path.dirname(filePath));
    let description = "";
    if (content.startsWith("---")) {
      const end = content.indexOf("\n---", 3);
      if (end > 0) {
        const frontmatter = content.slice(3, end);
        for (const line of frontmatter.split(/\r?\n/)) {
          const match = line.match(/^([A-Za-z_-]+):\s*(.+)$/);
          if (!match) continue;
          if (match[1] === "name") name = cleanYamlValue(match[2]) || name;
          if (match[1] === "description") description = cleanYamlValue(match[2]);
        }
      }
    }
    if (!description) {
      description = content
        .replace(/^---[\s\S]*?---\s*/, "")
        .split(/\r?\n/)
        .find((line) => line.trim() && !line.trim().startsWith("#"))
        ?.trim() || "";
    }
    return {
      id: path.basename(path.dirname(filePath)),
      name,
      description: description.slice(0, 520),
      path: filePath,
      root: "",
      content: content.slice(0, 9000),
    };
  } catch {
    return null;
  }
}

function walkForSkills(root, maxDepth = 3) {
  const found = [];
  const seen = new Set();

  function walk(current, depth) {
    if (depth > maxDepth) return;
    let real;
    try {
      real = fs.realpathSync(current);
    } catch {
      return;
    }
    if (seen.has(real)) return;
    seen.add(real);

    const skillFile = path.join(real, "SKILL.md");
    if (fs.existsSync(skillFile)) {
      const skill = parseSkill(skillFile);
      if (skill) {
        skill.root = root;
        found.push(skill);
      }
      return;
    }

    let entries = [];
    try {
      entries = fs.readdirSync(real, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".agents") continue;
      if (["node_modules", ".git", "dist", "release"].includes(entry.name)) continue;
      if (entry.isDirectory() || entry.isSymbolicLink()) walk(path.join(real, entry.name), depth + 1);
    }
  }

  walk(root, 0);
  return found;
}

function defaultRoots(extraRoots = []) {
  const candidates = [
    process.env.BRACE_SKILLS_DIR,
    path.join(os.homedir(), ".codex", "skills"),
    path.join(os.homedir(), ".agents", "skills"),
    ...extraRoots,
  ].filter(Boolean);
  return [...new Set(candidates.map((item) => path.resolve(item)))];
}

function listSkills({ roots = [], force = false } = {}) {
  const now = Date.now();
  if (!force && now - cache.at < CACHE_MS) return cache.skills;

  const unique = new Map();
  for (const root of defaultRoots(roots)) {
    if (!fs.existsSync(root)) continue;
    for (const skill of walkForSkills(root)) {
      const key = skill.id.toLowerCase();
      if (!unique.has(key)) unique.set(key, skill);
    }
  }

  cache = {
    at: now,
    skills: [...unique.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
  return cache.skills;
}

function tokenize(text) {
  return new Set(String(text || "").toLowerCase().match(/[a-z0-9][a-z0-9+_.-]{2,}/g) || []);
}

function scoreSkill(skill, taskTokens, taskText) {
  const haystack = `${skill.id} ${skill.name} ${skill.description}`.toLowerCase();
  let score = 0;
  for (const token of taskTokens) {
    if (haystack.includes(token)) score += token.length > 6 ? 2 : 1;
  }
  if (taskText.includes(skill.id.toLowerCase())) score += 8;
  if (taskText.includes(skill.name.toLowerCase())) score += 8;
  return score;
}

function findRelevantSkills(task, options = {}) {
  const limit = Math.max(0, Math.min(3, Number(options.limit || 2)));
  if (!limit) return [];
  const text = String(task || "").toLowerCase();
  const tokens = tokenize(text);
  return listSkills(options)
    .map((skill) => ({ skill, score: scoreSkill(skill, tokens, text) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ skill }) => skill);
}

function publicSkills(options = {}) {
  return listSkills(options).map(({ content: _content, ...skill }) => skill);
}

module.exports = { findRelevantSkills, listSkills, publicSkills };
