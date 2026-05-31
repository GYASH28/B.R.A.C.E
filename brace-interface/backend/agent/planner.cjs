const os = require("node:os");
const path = require("node:path");
const { analyzeCommandRisk } = require("../security/commandRiskAnalyzer.cjs");

function extractQuotedName(command) {
  const quoted = String(command).match(/["“](.+?)["”]/);
  if (quoted) return quoted[1];
  const called = String(command).match(/called\s+([A-Za-z0-9_-]+)/i);
  return called?.[1] || "";
}

function projectSearchTerm(command) {
  const match = String(command).match(/(?:for|find|search)\s+(?:my\s+)?([A-Za-z0-9_.-]+)/i);
  return match?.[1] || String(command).split(/\s+/).slice(-2).join(" ");
}

function createPlan({ command, classification, state, context }) {
  const idBase = Date.now().toString(36);
  const steps = [];
  const addStep = (tool, input, riskLevel, requiredPermission, title) => {
    steps.push({ id: `${idBase}-${steps.length + 1}`, title, tool, input, riskLevel, requiredPermission, status: "pending" });
  };
  const intent = classification.intent;
  const downloads = state.settings.defaultDownloadsFolder || path.join(os.homedir(), "Downloads");
  const projects = state.settings.defaultProjectsFolder || path.join(os.homedir(), "Documents");

  if (intent === "folder_search") {
    addStep("file.searchFiles", { rootPath: projects, query: projectSearchTerm(command), maxResults: 30 }, "medium", "files", "Search allowed project folders");
  } else if (intent === "folder_organize") {
    addStep("folder.organize.preview", { folderPath: downloads }, "medium", "folders", "Preview Downloads organization");
  } else if (intent === "memory_write") {
    addStep("memory.save", { title: extractQuotedName(command) || "Saved user memory", content: command, type: "project", tags: ["user-approved"] }, "medium", "memoryWrite", "Save local memory");
  } else if (intent === "system_info") {
    addStep("system.info", {}, "low", "systemInfo", "Read system status");
  } else if (intent === "app_launch") {
    addStep("app.openVSCode", { folderPath: context.workspacePath || projects }, "medium", "appLaunch", "Open VS Code");
  } else if (intent === "create_project") {
    const name = extractQuotedName(command) || String(command).match(/project\s+(?:called\s+)?([A-Za-z0-9_-]+)/i)?.[1] || "CampusMate";
    const folderPath = path.join(projects, name);
    addStep("file.createFolder", { folderPath }, "medium", "fileWrite", `Create project folder ${name}`);
    addStep("command.run", { command: "npm create vite@latest . -- --template react-ts", cwd: folderPath, timeoutMs: 120000 }, "high", "shell", "Initialize React project after approval");
    addStep("app.openVSCode", { folderPath }, "medium", "appLaunch", "Open new project in VS Code");
  } else if (intent === "terminal_command") {
    const commandText = String(command).replace(/^.*?(run command|terminal|powershell|cmd)[:\s-]*/i, "").trim();
    const risk = analyzeCommandRisk(commandText);
    addStep("command.run", { command: commandText, cwd: context.workspacePath || projects }, risk.riskLevel, "shell", "Run reviewed command");
  } else if (intent === "coding_task") {
    addStep("coding.scanProject", { projectPath: context.workspacePath || process.cwd() }, "medium", "coding", "Scan project before proposing code changes");
  } else if (intent === "browser_task") {
    addStep("browser.status", {}, "low", "browser", "Check browser automation availability");
  } else if (intent === "file_task") {
    if (context.selectedFile?.path) addStep("file.extractText", { filePath: context.selectedFile.path }, "medium", "files", "Extract selected file text");
  }

  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    command,
    intent,
    goal: command,
    riskLevel: steps.some((step) => step.riskLevel === "blocked") ? "blocked" : steps.some((step) => step.riskLevel === "high") ? "high" : steps.some((step) => step.riskLevel === "medium") ? "medium" : "low",
    status: "planned",
    steps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

module.exports = { createPlan };
