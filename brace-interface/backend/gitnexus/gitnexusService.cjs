/**
 * GitNexus service for B.R.A.C.E.
 * Manages AST-based codebase indexing, MCPServer status, and code mapping docs.
 * @module gitnexusService
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");

const IS_WIN = process.platform === "win32";
const NPX = IS_WIN ? "npx.cmd" : "npx";

class GitNexusService {
  constructor({ stateStore, logger, pathGuard }) {
    this.stateStore = stateStore;
    this.logger = logger;
    this.pathGuard = pathGuard;
    this.lastExecution = {
      command: "",
      stdout: "",
      stderr: "",
      exitCode: null,
      startedAt: null,
      endedAt: null
    };
  }

  /**
   * Detect if GitNexus CLI is available.
   */
  async checkAvailability() {
    return new Promise((resolve) => {
      execFile(NPX, ["--version"], { timeout: 5000 }, (err) => {
        if (err) {
          resolve({ available: false, error: "npx not found on system path." });
        } else {
          resolve({ available: true });
        }
      });
    });
  }

  /**
   * Check GitNexus index status of a project.
   */
  async status(projectPath) {
    const targetPath = path.resolve(projectPath || process.cwd());
    const isIndexed = fs.existsSync(path.join(targetPath, ".gitnexus"));
    
    // Check global/local CLI status
    const availability = await this.checkAvailability();
    if (!availability.available) {
      return { ok: false, indexed: false, error: availability.error };
    }

    return new Promise((resolve) => {
      const env = { ...process.env, GITNEXUS_SKIP_OPTIONAL_GRAMMARS: "1" };
      execFile(NPX, ["-y", "gitnexus@latest", "status"], { cwd: targetPath, env, timeout: 15000 }, (err, stdout, stderr) => {
        const output = stdout || stderr || "";
        resolve({
          ok: err ? false : true,
          indexed: isIndexed && !output.includes("not indexed"),
          output: output.trim(),
          error: err ? err.message : null,
          lastIndexTime: this.lastExecution.endedAt
        });
      });
    });
  }

  /**
   * Run GitNexus index/analysis.
   */
  async index(projectPath, mode = "analyze") {
    const targetPath = path.resolve(projectPath || process.cwd());
    const decision = this.pathGuard?.isAllowed(targetPath, { userSelected: true }) || { allowed: true };
    if (!decision.allowed) {
      throw new Error(`Path not allowed: ${decision.reason}`);
    }

    const commandArgs = mode === "reindex" ? ["analyze", "--force"] : ["analyze"];
    const exactCommand = `npx -y gitnexus@latest ${commandArgs.join(" ")}`;
    
    this.lastExecution = {
      command: exactCommand,
      stdout: "",
      stderr: "",
      exitCode: null,
      startedAt: new Date().toISOString(),
      endedAt: null
    };

    this.logger.log("gitnexus", `Starting analysis: ${exactCommand}`, { path: targetPath });

    return new Promise((resolve) => {
      const env = { ...process.env, GITNEXUS_SKIP_OPTIONAL_GRAMMARS: "1" };
      execFile(NPX, ["-y", "gitnexus@latest", ...commandArgs], { cwd: targetPath, env, timeout: 180000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        this.lastExecution.stdout = stdout || "";
        this.lastExecution.stderr = stderr || "";
        this.lastExecution.exitCode = err ? err.code || 1 : 0;
        this.lastExecution.endedAt = new Date().toISOString();

        if (err) {
          this.logger.log("error", `GitNexus analysis failed: ${err.message}`, {}, "medium", "error");
          resolve({
            ok: false,
            error: err.message,
            exitCode: this.lastExecution.exitCode,
            stdout: this.lastExecution.stdout,
            stderr: this.lastExecution.stderr,
            ...this.lastExecution
          });
        } else {
          this.logger.log("gitnexus", "GitNexus index completed successfully");
          resolve({
            ok: true,
            exitCode: 0,
            stdout: this.lastExecution.stdout,
            stderr: this.lastExecution.stderr,
            ...this.lastExecution
          });
        }
      });
    });
  }

  /**
   * Scan project root for generated files.
   */
  listDocs(projectPath) {
    const targetPath = path.resolve(projectPath || process.cwd());
    const docs = [
      { id: "agents", name: "AGENTS.md", relPath: "AGENTS.md" },
      { id: "claude", name: "CLAUDE.md", relPath: "CLAUDE.md" },
      { id: "codemap", name: "BRACE_CODEMAP.md", relPath: "BRACE_CODEMAP.md" },
      { id: "architecture", name: "ARCHITECTURE.md", relPath: "docs/ARCHITECTURE.md" }
    ];

    return docs.map((doc) => {
      const fullPath = path.join(targetPath, doc.relPath);
      const exists = fs.existsSync(fullPath);
      return {
        ...doc,
        exists,
        fullPath: exists ? fullPath.replaceAll("\\", "/") : null,
        size: exists ? fs.statSync(fullPath).size : 0,
        content: exists ? fs.readFileSync(fullPath, "utf8").slice(0, 15000) : ""
      };
    });
  }
}

module.exports = { GitNexusService };
