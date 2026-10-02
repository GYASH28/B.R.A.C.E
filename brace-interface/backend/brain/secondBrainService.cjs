const fs = require("node:fs");
const path = require("node:path");
const { redactSecrets } = require("../security/secretScanner.cjs");

const TEXT_EXTENSIONS = new Set([".md", ".txt", ".json"]);
const SKIP_DIRS = new Set([".git", "node_modules", ".cache", ".trash", ".obsidian", "dist", "release"]);

function termsFor(query) {
  return [...new Set(String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((term) => term.length >= 3)
    .slice(0, 18))];
}

function scoreText(text, terms) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    const first = lower.indexOf(term);
    if (first >= 0) {
      score += 2;
      if (first < 180) score += 1;
    }
  }
  return score;
}

function snippetAround(text, terms, limit = 900) {
  const compact = String(text || "").replace(/\r/g, "").trim();
  if (compact.length <= limit) return compact;
  const lower = compact.toLowerCase();
  let index = -1;
  for (const term of terms) {
    const found = lower.indexOf(term);
    if (found >= 0 && (index < 0 || found < index)) index = found;
  }
  const start = Math.max(0, (index < 0 ? 0 : index) - Math.floor(limit * 0.25));
  const slice = compact.slice(start, start + limit);
  return `${start > 0 ? "…" : ""}${slice}${start + limit < compact.length ? "…" : ""}`;
}

function walkTextFiles(root, { maxFiles = 3000, maxDepth = 12 } = {}) {
  const results = [];
  const stack = [{ dir: root, depth: 0 }];
  const rootReal = fs.realpathSync(root);

  while (stack.length && results.length < maxFiles) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      const full = path.join(current.dir, entry.name);
      if (entry.isDirectory()) {
        if (current.depth < maxDepth && !SKIP_DIRS.has(entry.name)) {
          stack.push({ dir: full, depth: current.depth + 1 });
        }
        continue;
      }
      if (!entry.isFile() || !TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      let real;
      try {
        real = fs.realpathSync(full);
      } catch {
        continue;
      }
      if (real !== rootReal && !real.startsWith(`${rootReal}${path.sep}`)) continue;
      results.push(real);
    }
  }
  return results;
}

function createSecondBrainService({ stateStore, memoryManager, noteManager, logger } = {}) {
  let cachedRoot = "";
  let cachedFiles = [];
  let cachedAt = 0;
  const textCache = new Map();

  function configuredPath() {
    const state = stateStore.readState();
    return String(state.settings?.secondBrainPath || process.env.BRACE_BRAIN_PATH || "").trim();
  }

  function invalidate() {
    cachedRoot = "";
    cachedFiles = [];
    cachedAt = 0;
    textCache.clear();
  }

  function readCachedText(file) {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      textCache.delete(file);
      return null;
    }
    if (!stat.isFile() || stat.size > 350_000) return null;

    const cached = textCache.get(file);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      return cached.text;
    }

    try {
      const text = fs.readFileSync(file, "utf8");
      textCache.set(file, { mtimeMs: stat.mtimeMs, size: stat.size, text });
      return text;
    } catch {
      textCache.delete(file);
      return null;
    }
  }

  function setVault(vaultPath) {
    const resolved = path.resolve(String(vaultPath || ""));
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      throw new Error("Second Brain folder does not exist.");
    }
    stateStore.updateState((state) => {
      state.settings = { ...state.settings, secondBrainPath: resolved };
      return state;
    });
    invalidate();
    logger?.log?.("memory", "Second Brain folder connected.", { path: resolved }, "low");
    return status();
  }

  function filesForVault(root) {
    if (!root) return [];
    const now = Date.now();
    if (cachedRoot === root && now - cachedAt < 60_000) return cachedFiles;
    cachedFiles = walkTextFiles(root);
    cachedRoot = root;
    cachedAt = now;
    return cachedFiles;
  }

  function status() {
    const root = configuredPath();
    const connected = Boolean(root && fs.existsSync(root) && fs.statSync(root).isDirectory());
    return {
      connected,
      path: connected ? root : null,
      indexedFiles: connected ? filesForVault(root).length : 0,
      localMemories: memoryManager?.listMemories?.().length || 0,
      localNotes: noteManager?.listNotes?.().length || 0,
    };
  }

  function search(query, { limit = 5 } = {}) {
    const terms = termsFor(query);
    if (!terms.length) return [];
    const candidates = [];

    for (const memory of memoryManager?.listMemories?.() || []) {
      const text = `${memory.title || ""}\n${memory.content || ""}\n${(memory.tags || []).join(" ")}`;
      const score = scoreText(text, terms) + 1;
      if (score > 1) {
        candidates.push({
          kind: "memory",
          title: memory.title || "Memory",
          path: null,
          score,
          content: snippetAround(memory.content || "", terms),
        });
      }
    }

    for (const note of noteManager?.listNotes?.() || []) {
      let text = "";
      try { text = fs.readFileSync(note.path, "utf8"); } catch { continue; }
      const score = scoreText(`${note.name}\n${text}`, terms);
      if (score > 0) {
        candidates.push({
          kind: "note",
          title: note.name,
          path: note.path,
          score,
          content: snippetAround(text, terms),
        });
      }
    }

    const root = configuredPath();
    if (root && fs.existsSync(root)) {
      for (const file of filesForVault(root)) {
        const text = readCachedText(file);
        if (text == null) continue;
        const relative = path.relative(root, file);
        const score = scoreText(`${relative}\n${text}`, terms);
        if (score > 0) {
          candidates.push({
            kind: "vault",
            title: path.basename(file),
            path: file,
            relativePath: relative,
            score,
            content: snippetAround(text, terms),
          });
        }
      }
    }

    return candidates
      .sort((a, b) => b.score - a.score || String(a.title).localeCompare(String(b.title)))
      .slice(0, Math.max(1, Math.min(12, limit)))
      .map((item) => ({ ...item, content: redactSecrets(item.content) }));
  }

  function buildContext(query, { limit = 5, maxChars = 6500 } = {}) {
    const results = search(query, { limit });
    let used = 0;
    const sections = [];
    const sources = [];

    for (const result of results) {
      const heading = result.relativePath || result.title;
      const available = Math.max(0, maxChars - used);
      if (available < 160) break;
      const body = String(result.content || "").slice(0, available);
      sections.push(`--- ${result.kind.toUpperCase()}: ${heading} ---\n${body}`);
      used += body.length;
      sources.push({
        kind: result.kind,
        title: result.title,
        path: result.path,
        relativePath: result.relativePath || null,
      });
    }

    return {
      count: sources.length,
      sources,
      context: sections.join("\n\n"),
    };
  }

  return { buildContext, invalidate, search, setVault, status };
}

module.exports = { createSecondBrainService, scoreText, termsFor, walkTextFiles };
