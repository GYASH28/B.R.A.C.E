#!/usr/bin/env node
/**
 * B.R.A.C.E Health Check — checks all services.
 */
const http = require("node:http");
const { execFile } = require("node:child_process");

const checks = [];

function httpCheck(name, url, timeout = 5000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => resolve({ name, ok: true, status: res.statusCode, detail: data.slice(0, 100) }));
    });
    req.on("error", (e) => resolve({ name, ok: false, error: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ name, ok: false, error: "Timeout" }); });
  });
}

async function main() {
  console.log("\n  B.R.A.C.E System Health Check\n  ─────────────────────────────\n");

  const brace = await httpCheck("B.R.A.C.E Backend (17500)", "http://127.0.0.1:17500/api/health");
  const voicebox = await httpCheck("Voicebox (17493)", "http://127.0.0.1:17493/profiles");

  const gitnexus = await new Promise((resolve) => {
    const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
    execFile(cmd, ["-y", "gitnexus@latest", "status"], { timeout: 30000, cwd: process.cwd() }, (err, stdout) => {
      resolve({ name: "GitNexus Index", ok: !err, detail: (stdout || "").trim().slice(0, 100), error: err?.message });
    });
  });

  const results = [brace, voicebox, gitnexus];
  for (const r of results) {
    const icon = r.ok ? "✅" : "❌";
    const detail = r.ok ? (r.detail || `HTTP ${r.status}`) : (r.error || "Failed");
    console.log(`  ${icon}  ${r.name.padEnd(30)} ${detail}`);
  }

  const allOk = results.every((r) => r.ok);
  console.log(`\n  ${allOk ? "✅ All systems operational" : "⚠️  Some services are offline"}\n`);
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
