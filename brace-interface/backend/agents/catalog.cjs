const AGENTS = [
  { id: "conductor", name: "Conductor", icon: "◎", tier: "luna", description: "Primary daily-drive brain. Routes work and keeps responses fast.", keywords: [] },
  { id: "planner", name: "Planner", icon: "◇", tier: "luna", description: "Turns goals into practical plans, checklists, and next actions.", keywords: ["plan", "schedule", "roadmap", "prioritize", "today"] },
  { id: "researcher", name: "Researcher", icon: "⌕", tier: "terra", description: "Synthesizes research, comparisons, sources, and technical findings.", keywords: ["research", "compare", "investigate", "find", "evidence"] },
  { id: "coder", name: "Coder", icon: "</>", tier: "terra", description: "Implements features and code changes with repository context.", keywords: ["code", "implement", "feature", "typescript", "javascript", "python", "react"] },
  { id: "debugger", name: "Debugger", icon: "⚙", tier: "sol", description: "Diagnoses stubborn failures, regressions, logs, and environment issues.", keywords: ["bug", "debug", "crash", "error", "broken", "fails", "trace"] },
  { id: "architect", name: "Architect", icon: "⌬", tier: "sol", description: "Designs systems, interfaces, data flows, and long-lived architecture.", keywords: ["architecture", "system design", "scale", "backend", "infrastructure"] },
  { id: "ui-designer", name: "UI Designer", icon: "✦", tier: "terra", description: "Designs polished interfaces, interaction states, motion, and UX.", keywords: ["ui", "ux", "design", "animation", "interface", "visual"] },
  { id: "reviewer", name: "Reviewer", icon: "✓", tier: "terra", description: "Reviews code, plans, artifacts, and assumptions before completion.", keywords: ["review", "audit", "verify", "check", "qa"] },
  { id: "security", name: "Security", icon: "◈", tier: "sol", description: "Threat-models changes and checks permissions, secrets, and risky actions.", keywords: ["security", "permission", "secret", "auth", "vulnerability"] },
  { id: "data-analyst", name: "Data Analyst", icon: "▥", tier: "terra", description: "Analyzes datasets, metrics, trends, and business questions.", keywords: ["data", "metrics", "analytics", "csv", "spreadsheet", "kpi"] },
  { id: "document", name: "Document", icon: "▤", tier: "luna", description: "Drafts and transforms documents, notes, reports, and structured writing.", keywords: ["document", "pdf", "report", "write", "resume", "notes"] },
  { id: "mail", name: "Mail", icon: "✉", tier: "luna", description: "Handles email triage, summaries, drafting, and follow-up preparation.", keywords: ["email", "gmail", "mail", "inbox", "reply"] },
  { id: "calendar", name: "Calendar", icon: "□", tier: "luna", description: "Reasons about schedules, meetings, availability, and time blocks.", keywords: ["calendar", "meeting", "appointment", "availability", "event"] },
  { id: "files", name: "Files", icon: "▱", tier: "luna", description: "Finds, reads, organizes, and reasons over approved local files.", keywords: ["file", "folder", "download", "organize", "search files"] },
  { id: "system", name: "System", icon: "◉", tier: "terra", description: "Understands the PC, apps, processes, Linux, and controlled commands.", keywords: ["pc", "linux", "kubuntu", "terminal", "system", "install", "app"] },
  { id: "git", name: "Git", icon: "⑂", tier: "terra", description: "Works with repositories, diffs, branches, commits, and pull requests.", keywords: ["git", "github", "repo", "branch", "commit", "pull request"] },
  { id: "memory", name: "Memory", icon: "∞", tier: "luna", description: "Retrieves useful project and preference context from BRACE memory.", keywords: ["remember", "memory", "previous", "context", "recall"] },
];

function publicAgentCatalog() {
  return AGENTS.map(({ keywords: _keywords, ...agent }) => agent);
}

module.exports = { AGENTS, publicAgentCatalog };
