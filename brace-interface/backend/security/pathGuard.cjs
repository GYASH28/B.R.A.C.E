const os = require("node:os");
const path = require("node:path");

const DEFAULT_BLOCKED_ROOTS = [
  "C:\\",
  "C:\\Windows",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
  path.join(os.homedir(), "AppData"),
];

function normalizePath(value) {
  return path.resolve(String(value ?? ""));
}

function isInside(childPath, rootPath) {
  const child = normalizePath(childPath).toLowerCase();
  const root = normalizePath(rootPath).toLowerCase();
  return child === root || child.startsWith(`${root}${path.sep.toLowerCase()}`);
}

function createPathGuard({ safeRoots = [], blockedRoots = DEFAULT_BLOCKED_ROOTS } = {}) {
  const safe = safeRoots.filter(Boolean).map(normalizePath);
  const blocked = blockedRoots.filter(Boolean).map(normalizePath);

  function isBlocked(targetPath) {
    const resolved = normalizePath(targetPath);
    return blocked.some((root) => resolved.toLowerCase() === root.toLowerCase() || isInside(resolved, root));
  }

  function isAllowed(targetPath, options = {}) {
    const resolved = normalizePath(targetPath);
    if (safe.some((root) => isInside(resolved, root))) {
      return { allowed: true, path: resolved, reason: "Path is inside an allowed root." };
    }
    if (isBlocked(resolved) && !options.allowSensitive) {
      return { allowed: false, path: resolved, reason: "Path is inside a blocked sensitive system location." };
    }
    if (safe.length === 0) {
      return { allowed: true, path: resolved, reason: "Path is inside an allowed root." };
    }
    if (options.userSelected) {
      return { allowed: true, path: resolved, reason: "Path was selected by the user for this action." };
    }
    return { allowed: false, path: resolved, reason: "Path is outside configured safe roots and was not selected by the user." };
  }

  return { isAllowed, isBlocked, normalizePath, safeRoots: safe, blockedRoots: blocked };
}

module.exports = { DEFAULT_BLOCKED_ROOTS, createPathGuard, normalizePath, isInside };
