function permission(label, description, riskLevel = "low") {
  return { label, description, riskLevel, enabled: false, lastUsed: null };
}

function defaultPermissions() {
  return {
    aiModel: permission("AI model access", "Allows B.R.A.C.E to call the configured AI model.", "medium"),
    microphone: permission("Microphone", "Allows voice input through your microphone.", "medium"),
    files: permission("Local file read", "Allows reading files you select or approved safe folders.", "medium"),
    fileWrite: permission("Local file write", "Allows creating or editing files after approval.", "high"),
    folders: permission("Folder organization", "Allows scanning and organizing selected folders.", "high"),
    shell: permission("Terminal commands", "Allows controlled local command execution after review.", "high"),
    appLaunch: permission("App launching", "Allows opening configured apps, folders, URLs, and VS Code.", "medium"),
    browser: permission("Browser automation", "Allows controlled browser automation with visible state.", "high"),
    coding: permission("Coding agent edits", "Allows project scans, backups, diffs, and approved edits.", "high"),
    memoryRead: permission("Memory read", "Allows searching local B.R.A.C.E memory.", "low"),
    memoryWrite: permission("Memory write", "Allows saving approved memories.", "medium"),
    voiceInput: permission("Voice input", "Allows microphone input for push-to-talk.", "medium"),
    voiceOutput: permission("Voice output", "Allows local text-to-speech output.", "low"),
    network: permission("Network/web access", "Allows web requests through configured providers or tools.", "medium"),
    mcp: permission("MCP tools", "Allows configured MCP tools to appear in the tool registry.", "high"),
    git: permission("Git operations", "Allows approved git inspection and safe operations.", "high"),
    systemInfo: permission("System info", "Allows reading CPU, RAM, storage, battery, network, and OS status.", "low"),
    notifications: permission("Notifications", "Allows visible desktop notifications.", "low"),
    startup: permission("Startup", "Allows launching B.R.A.C.E when Windows starts.", "high"),
    admin: permission("Admin-required actions", "Does not bypass UAC; allows only explained admin requests.", "high"),
  };
}

function requirePermission(state, name) {
  if (!state.permissions?.[name]?.enabled) {
    const label = state.permissions?.[name]?.label ?? name;
    const error = new Error(`I need ${label} permission to do this. Please enable it in Settings > Permissions.`);
    error.code = "PERMISSION_DISABLED";
    error.permission = name;
    throw error;
  }
}

function touchPermission(state, name, timestamp = new Date().toISOString()) {
  if (state.permissions?.[name]) state.permissions[name].lastUsed = timestamp;
}

module.exports = { defaultPermissions, permission, requirePermission, touchPermission };
