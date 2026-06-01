const { runCommand } = require("./commandTools.cjs");

function gitStatus(cwd) {
  return runCommand({ command: "git status --short", cwd, timeoutMs: 10000 });
}

function gitDiff(cwd) {
  return runCommand({ command: "git diff --", cwd, timeoutMs: 10000 });
}

module.exports = { gitDiff, gitStatus };
