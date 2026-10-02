const os = require("node:os");
const path = require("node:path");
const { requirePermission, touchPermission } = require("../security/permissionManager.cjs");
const appTools = require("../tools/appTools.cjs");

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function prettyBytes(bytes) {
  const gb = bytes / 1024 / 1024 / 1024;
  return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
}

function launchTarget(command) {
  const text = normalize(command)
    .replace(/^(hey\s+brace[, ]*|brace[, ]*)/, "")
    .replace(/\bplease\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const match = text.match(/^(?:open|launch|start)\s+(?:the\s+)?(.+?)\s*$/);
  return match?.[1]?.trim() || "";
}

function detectFastAction(command, { apps = [] } = {}) {
  const text = normalize(command);
  if (!text) return null;

  if (
    /\b(ram|memory)\b/.test(text) &&
    /\b(show|check|usage|used|free|available|how much|what(?:'s| is))\b/.test(text)
  ) {
    return { id: "system.ram", permission: "systemInfo" };
  }

  if (
    /\bcpu\b/.test(text) &&
    /\b(show|check|usage|cores?|processor|what(?:'s| is))\b/.test(text)
  ) {
    return { id: "system.cpu", permission: "systemInfo" };
  }

  if (/\b(system info|system information|computer info|pc info|machine info)\b/.test(text)) {
    return { id: "system.summary", permission: "systemInfo" };
  }

  if (/\b(what os|which os|operating system|kernel version|hostname)\b/.test(text)) {
    return { id: "system.os", permission: "systemInfo" };
  }

  const target = launchTarget(text);
  if (!target || /^https?:\/\//.test(target)) return null;

  if (/^(?:vs ?code|vscode|visual studio code)$/.test(target)) {
    return { id: "app.vscode", permission: "appLaunch", target };
  }
  if (/^(?:downloads?|downloads folder|my downloads)$/.test(target)) {
    return { id: "folder.downloads", permission: "appLaunch", target };
  }
  if (/^(?:documents?|documents folder|my documents)$/.test(target)) {
    return { id: "folder.documents", permission: "appLaunch", target };
  }

  const normalizedTarget = target.replace(/\.(exe|desktop|appimage|bat|cmd)$/i, "").trim();
  const app = apps.find((candidate) => {
    const name = normalize(candidate?.name)
      .replace(/\.(exe|desktop|appimage|bat|cmd)$/i, "")
      .trim();
    return name && (
      name === normalizedTarget ||
      name.includes(normalizedTarget) ||
      normalizedTarget.includes(name)
    );
  });

  return app
    ? { id: "app.registered", permission: "appLaunch", target, appId: app.id }
    : null;
}

function permissionPrompt(state, permissionName, action) {
  const permission = state.permissions?.[permissionName];
  return {
    handled: true,
    mode: "permission",
    direct: true,
    action,
    permissionRequired: {
      name: permissionName,
      label: permission?.label || permissionName,
      description: permission?.description || "This local capability needs permission.",
      riskLevel: permission?.riskLevel || "medium",
    },
  };
}

function createFastActionService({ stateStore, shell, logger } = {}) {
  async function tryRun({ command, workspacePath } = {}) {
    const state = stateStore.readState();
    const action = detectFastAction(command, { apps: state.apps || [] });
    if (!action) return { handled: false };

    if (!state.permissions?.[action.permission]?.enabled) {
      return permissionPrompt(state, action.permission, action);
    }

    requirePermission(state, action.permission);
    const settings = state.settings || {};
    let text = "";

    if (action.id === "system.ram") {
      const total = os.totalmem();
      const free = os.freemem();
      const used = Math.max(0, total - free);
      text = `RAM: ${prettyBytes(used)} used of ${prettyBytes(total)} · ${prettyBytes(free)} available.`;
    } else if (action.id === "system.cpu") {
      const cpus = os.cpus();
      const model = cpus[0]?.model?.trim() || "CPU";
      text = `${model} · ${cpus.length} logical cores.`;
    } else if (action.id === "system.os") {
      text = `${os.type()} ${os.release()} · ${os.arch()} · ${os.hostname()}.`;
    } else if (action.id === "system.summary") {
      const total = os.totalmem();
      const free = os.freemem();
      text = [
        `${os.type()} ${os.release()} · ${os.arch()}`,
        `${os.cpus()[0]?.model?.trim() || "CPU"} · ${os.cpus().length} logical cores`,
        `RAM ${prettyBytes(total - free)} / ${prettyBytes(total)}`,
        `Host ${os.hostname()}`,
      ].join(" · ");
    } else if (action.id === "app.vscode") {
      const folder = workspacePath || settings.defaultProjectsFolder || process.cwd();
      const result = await appTools.openVSCode({ folderPath: folder, shell });
      text = result.message;
    } else if (action.id === "folder.downloads") {
      const folder = settings.defaultDownloadsFolder || path.join(os.homedir(), "Downloads");
      const result = await appTools.openProjectFolder({ folderPath: folder, shell });
      text = result.message;
    } else if (action.id === "folder.documents") {
      const folder = settings.defaultProjectsFolder || path.join(os.homedir(), "Documents");
      const result = await appTools.openProjectFolder({ folderPath: folder, shell });
      text = result.message;
    } else if (action.id === "app.registered") {
      const app = (state.apps || []).find((candidate) => candidate.id === action.appId);
      if (!app) return { handled: false };
      const result = await appTools.openSpecificApp({ appPath: app.path, shell });
      text = `Opened ${app.name}.`;
      if (!result.ok) throw new Error("The registered app could not be launched.");
    }

    touchPermission(state, action.permission);
    stateStore.writeState(state);
    logger?.log?.("fast-action", `Local fast action: ${action.id}`, { action, command }, state.permissions[action.permission]?.riskLevel || "low");

    return {
      handled: true,
      ok: true,
      mode: "direct",
      direct: true,
      text,
      action,
      latencyClass: "local",
    };
  }

  return { tryRun };
}

module.exports = { createFastActionService, detectFastAction, launchTarget, prettyBytes };
