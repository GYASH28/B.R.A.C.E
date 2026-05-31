#!/usr/bin/env node
/**
 * Start Voicebox or report its status.
 */
const http = require("node:http");
const { exec } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const url = process.env.VOICEBOX_BASE_URL || "http://127.0.0.1:17493";

function checkRunning() {
  return new Promise((resolve) => {
    const req = http.get(`${url}/profiles`, { timeout: 3000 }, () => resolve(true));
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

const SEARCH_PATHS = [
  path.join(process.env.LOCALAPPDATA || "", "Voicebox", "Voicebox.exe"),
  path.join(process.env.PROGRAMFILES || "", "Voicebox", "Voicebox.exe"),
  path.join(process.env.USERPROFILE || "", "AppData", "Local", "Programs", "voicebox", "Voicebox.exe"),
  path.join(process.env.USERPROFILE || "", "Desktop", "Voicebox.exe"),
];

async function main() {
  console.log("\n  B.R.A.C.E — Voicebox Launcher\n");

  if (await checkRunning()) {
    console.log("  ✅ Voicebox is already running.\n");
    return;
  }

  console.log("  Voicebox is not running. Searching for installed binary...\n");
  for (const p of SEARCH_PATHS) {
    if (fs.existsSync(p)) {
      console.log(`  Found: ${p}`);
      console.log("  Launching Voicebox...\n");
      exec(`start "" "${p}"`, { shell: true });
      // Wait and verify
      await new Promise((r) => setTimeout(r, 5000));
      if (await checkRunning()) {
        console.log("  ✅ Voicebox started successfully.\n");
      } else {
        console.log("  ⏳ Voicebox is starting (may take a moment to load models).\n");
      }
      return;
    }
  }

  console.log("  ❌ Voicebox executable not found.\n");
  console.log("  To install Voicebox:");
  console.log("  1. Download from https://voicebox.sh");
  console.log("  2. Install the Windows .exe/.msi");
  console.log("  3. Launch Voicebox");
  console.log("  4. Re-run: npm run brace:voicebox\n");
}

main().catch(console.error);
