import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, "..");
const artifactDir = path.join(appDir, "artifacts");
const label = String(process.env.BRACE_VISUAL_LABEL || "smoke")
  .replace(/[^a-z0-9_-]+/gi, "-")
  .toLowerCase();
const screenshotPath = path.join(artifactDir, `brace-shell-${label}.png`);

fs.mkdirSync(artifactDir, { recursive: true });
fs.rmSync(screenshotPath, { force: true });

const child = spawn(electronPath, ["--no-sandbox", "."], {
  cwd: appDir,
  stdio: "inherit",
  env: {
    ...process.env,
    BRACE_VISUAL_SMOKE: "1",
    BRACE_VISUAL_SCREENSHOT: screenshotPath,
  },
});

const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal) reject(new Error(`Electron visual smoke exited via ${signal}`));
    else resolve(code ?? 1);
  });
});

if (exitCode !== 0) {
  throw new Error(`Electron visual smoke failed with exit code ${exitCode}`);
}
if (!fs.existsSync(screenshotPath) || fs.statSync(screenshotPath).size < 1000) {
  throw new Error("Electron visual smoke did not create a valid screenshot.");
}

process.stdout.write(`✅ Electron visual smoke passed · ${screenshotPath}\n`);
