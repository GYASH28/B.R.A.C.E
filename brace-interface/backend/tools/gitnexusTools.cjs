/**
 * GitNexus tools for B.R.A.C.E agent system.
 * Wraps GitNexus CLI commands as agent-callable tools.
 * @module gitnexusTools
 */

const { execFile } = require("node:child_process");
const path = require("node:path");

const IS_WIN = process.platform === "win32";
const NPX = IS_WIN ? "npx.cmd" : "npx";

/**
 * Run a GitNexus CLI command.
 * @param {string[]} args - CLI arguments
 * @param {string} cwd - Working directory
 * @param {number} [timeout=120000] - Timeout in ms
 * @returns {Promise<{ok: boolean, output: string, error?: string}>}
 */
function runGitNexus(args, cwd, timeout = 120000) {
  return new Promise((resolve) => {
    const env = { ...process.env, GITNEXUS_SKIP_OPTIONAL_GRAMMARS: "1" };
    execFile(NPX, ["-y", "gitnexus@latest", ...args], { cwd, timeout, env, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, output: stdout || "", error: err.message || stderr });
      } else {
        resolve({ ok: true, output: stdout || stderr || "Done" });
      }
    });
  });
}

/**
 * Run GitNexus analysis on a project path.
 * @param {string} projectPath - Path to analyze
 * @returns {Promise<{ok: boolean, output: string, error?: string}>}
 */
async function analyzeProject(projectPath) {
  const cwd = path.resolve(projectPath || process.cwd());
  return runGitNexus(["analyze"], cwd, 180000);
}

/**
 * Get GitNexus index status.
 * @param {string} projectPath
 * @returns {Promise<{ok: boolean, output: string, indexed: boolean, error?: string}>}
 */
async function getStatus(projectPath) {
  const cwd = path.resolve(projectPath || process.cwd());
  const result = await runGitNexus(["status"], cwd, 30000);
  return { ...result, indexed: result.ok && !result.output.includes("not indexed") };
}

/**
 * Force re-index a project.
 * @param {string} projectPath
 * @returns {Promise<{ok: boolean, output: string, error?: string}>}
 */
async function reindexProject(projectPath) {
  const cwd = path.resolve(projectPath || process.cwd());
  return runGitNexus(["analyze", "--force"], cwd, 180000);
}

/**
 * Create tool definitions for the B.R.A.C.E tool registry.
 * @returns {Array} Tool definition objects
 */
function createGitNexusTools() {
  return [
    {
      name: "gitnexus.analyze",
      description: "Index/analyze the codebase with GitNexus for AI code intelligence.",
      riskLevel: "medium",
      requiredPermission: "coding",
      execute: ({ projectPath }) => analyzeProject(projectPath || process.cwd()),
    },
    {
      name: "gitnexus.status",
      description: "Check GitNexus index status for the current project.",
      riskLevel: "low",
      requiredPermission: "coding",
      execute: ({ projectPath }) => getStatus(projectPath || process.cwd()),
    },
    {
      name: "gitnexus.reindex",
      description: "Force re-index the project with GitNexus.",
      riskLevel: "medium",
      requiredPermission: "coding",
      execute: ({ projectPath }) => reindexProject(projectPath || process.cwd()),
    },
  ];
}

module.exports = { analyzeProject, getStatus, reindexProject, createGitNexusTools };
