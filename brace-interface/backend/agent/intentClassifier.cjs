function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function classifyIntent(command) {
  const text = String(command || "").toLowerCase();
  if (includesAny(text, ["remember", "save this", "store this"])) return { intent: "memory_write", confidence: 0.9 };
  if (includesAny(text, ["organize", "clean downloads", "clean folder"])) return { intent: "folder_organize", confidence: 0.88 };
  if (includesAny(text, ["search my pc", "find folder", "find project", "where is", "search folder"])) return { intent: "folder_search", confidence: 0.86 };
  if (includesAny(text, ["fix this error", "bug", "refactor", "build failed", "lint", "read package.json", "generate readme"])) return { intent: "coding_task", confidence: 0.84 };
  if (includesAny(text, ["open chrome", "research", "browse", "search web"])) return { intent: "browser_task", confidence: 0.8 };
  if (includesAny(text, ["create react project", "new react project", "npm create", "vite project"])) return { intent: "create_project", confidence: 0.83 };
  if (includesAny(text, ["open vs code", "open vscode", "open folder", "open file explorer"])) return { intent: "app_launch", confidence: 0.8 };
  if (includesAny(text, ["run command", "terminal", "powershell", "cmd"])) return { intent: "terminal_command", confidence: 0.75 };
  if (includesAny(text, ["read this pdf", "summarize file", "make notes", "extract key points"])) return { intent: "file_task", confidence: 0.82 };
  if (includesAny(text, ["plan my day", "routine", "timetable", "schedule"])) return { intent: "planning", confidence: 0.78 };
  if (includesAny(text, ["system info", "cpu", "ram", "disk usage", "battery"])) return { intent: "system_info", confidence: 0.8 };
  return { intent: "chat_only", confidence: 0.55 };
}

module.exports = { classifyIntent };
