const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

function spawnDetached(command, args = [], spawnFn = spawn) {
  return new Promise((resolve, reject) => {
    const child = spawnFn(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    let settled = false;
    child.once("spawn", () => {
      if (settled) return;
      settled = true;
      child.unref();
      resolve(child);
    });
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

async function openVSCode({ folderPath, shell, appPath = "code", platform = process.platform, spawnFn = spawn }) {
  const target = path.resolve(folderPath || process.cwd());

  if (platform === "linux") {
    try {
      await spawnDetached(appPath || "code", [target], spawnFn);
      return { ok: true, message: `Opened VS Code: ${target}`, method: "binary" };
    } catch {
      // Fall back to the registered vscode:// handler below.
    }
  }

  const uriTarget = target.replaceAll("\\", "/");
  await shell.openExternal(`vscode://file/${uriTarget}`);
  return { ok: true, message: `Requested VS Code open for ${target}`, method: "uri" };
}

async function openProjectFolder({ folderPath, shell }) {
  const result = await shell.openPath(path.resolve(folderPath));
  if (result) throw new Error(result);
  return { ok: true, message: `Opened folder: ${folderPath}` };
}

async function openURL({ url, shell }) {
  if (!/^https?:\/\//i.test(url || "")) throw new Error("Only http/https URLs are allowed.");
  await shell.openExternal(url);
  return { ok: true, message: `Opened URL: ${url}` };
}

async function openSpecificApp({ appPath, spawnFn = spawn }) {
  if (!appPath || !fs.existsSync(appPath)) throw new Error("App path does not exist.");
  await spawnDetached(appPath, [], spawnFn);
  return { ok: true, message: `Launched app: ${appPath}` };
}

module.exports = { openProjectFolder, openSpecificApp, openURL, openVSCode, spawnDetached };
