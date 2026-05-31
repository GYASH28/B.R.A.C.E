const { spawn } = require("node:child_process");
const { analyzeCommandRisk } = require("../security/commandRiskAnalyzer.cjs");

function explainCommand(command, cwd) {
  const risk = analyzeCommandRisk(command);
  return {
    command,
    cwd,
    riskLevel: risk.riskLevel,
    explanation: risk.reason,
    mayChangeSystem: ["medium", "high", "blocked"].includes(risk.riskLevel),
  };
}

function runCommand({ command, cwd, timeoutMs = 30000 }) {
  const risk = analyzeCommandRisk(command);
  if (risk.riskLevel === "blocked") {
    const error = new Error(risk.reason);
    error.riskLevel = "blocked";
    throw error;
  }
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, { cwd, shell: true, windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      stderr += "\nCommand timed out and was terminated.";
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ ok: exitCode === 0, command, cwd, stdout: stdout.slice(-20000), stderr: stderr.slice(-20000), exitCode, runtimeMs: Date.now() - startedAt, riskLevel: risk.riskLevel });
    });
  });
}

module.exports = { explainCommand, runCommand };
