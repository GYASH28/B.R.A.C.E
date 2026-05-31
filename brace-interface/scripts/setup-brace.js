#!/usr/bin/env node
/**
 * B.R.A.C.E Setup — checks dependencies and configures the environment.
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function getVersion(cmd, args = ["--version"]) {
  try { return execFileSync(cmd, args, { encoding: "utf8", timeout: 5000 }).trim(); }
  catch { return null; }
}

console.log("\n  B.R.A.C.E Setup\n  ═══════════════\n");

const checks = [
  { name: "Node.js", version: getVersion("node"), required: "18+" },
  { name: "npm", version: getVersion("npm"), required: "9+" },
  { name: "Python", version: getVersion("python"), required: "3.11+" },
  { name: "Git", version: getVersion("git"), required: "2.30+" },
];

for (const c of checks) {
  const ok = c.version ? "✅" : "❌";
  console.log(`  ${ok}  ${c.name.padEnd(12)} ${c.version || `NOT FOUND (need ${c.required})`}`);
}

// Check GitNexus
const gitnexus = getVersion(process.platform === "win32" ? "npx.cmd" : "npx", ["-y", "gitnexus@latest", "--version"]);
console.log(`  ${gitnexus ? "✅" : "⚠️"}  ${"GitNexus".padEnd(12)} ${gitnexus || "Not installed (will use npx)"}`);

// Check .env
const envPath = path.join(__dirname, "..", ".env");
const examplePath = path.join(__dirname, "..", ".env.example");
if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log("\n  📋 Created .env from .env.example");
} else if (fs.existsSync(envPath)) {
  console.log("\n  📋 .env file exists");
}

console.log("\n  Setup complete. Run 'npm run brace:dev' to start.\n");
