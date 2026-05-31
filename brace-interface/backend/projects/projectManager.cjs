const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function detectProjectType(projectPath) {
  if (fs.existsSync(path.join(projectPath, "package.json"))) return "node";
  if (fs.existsSync(path.join(projectPath, "requirements.txt")) || fs.existsSync(path.join(projectPath, "pyproject.toml"))) return "python";
  if (fs.existsSync(path.join(projectPath, "Cargo.toml"))) return "rust";
  return "unknown";
}

function readPackageScripts(projectPath) {
  const packagePath = path.join(projectPath, "package.json");
  if (!fs.existsSync(packagePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(packagePath, "utf8")).scripts || {};
  } catch {
    return {};
  }
}

function gitStatus(projectPath) {
  if (!fs.existsSync(path.join(projectPath, ".git"))) return { isRepo: false, status: "" };
  try {
    const status = execFileSync("git", ["status", "--short"], { cwd: projectPath, encoding: "utf8", timeout: 5000 });
    return { isRepo: true, status };
  } catch (error) {
    return { isRepo: true, status: `git status failed: ${error.message}` };
  }
}

function scanProject(projectPath) {
  const resolved = path.resolve(projectPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) throw new Error("Project folder not found.");
  const entries = fs.readdirSync(resolved, { withFileTypes: true })
    .filter((entry) => !["node_modules", ".git", "dist", "build", "release"].includes(entry.name))
    .slice(0, 120)
    .map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "folder" : "file" }));
  return {
    path: resolved,
    name: path.basename(resolved),
    type: detectProjectType(resolved),
    scripts: readPackageScripts(resolved),
    git: gitStatus(resolved),
    entries,
  };
}

module.exports = { detectProjectType, readPackageScripts, gitStatus, scanProject };
