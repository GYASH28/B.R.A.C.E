/**
 * Command Router for B.R.A.C.E.
 * Detects natural language commands and routes them to handlers.
 * @module commandRouter
 */

const COMMANDS = [
  { id: "speak", patterns: [/(?:brace[,.]?\s+)?speak\s+this\s+(.+)/i, /(?:brace[,.]?\s+)?say\s+(.+)/i], extract: (m) => ({ text: m[1] }) },
  { id: "read_last", patterns: [/(?:brace[,.]?\s+)?read\s+(?:the\s+)?last\s+response/i, /(?:brace[,.]?\s+)?replay\s+last/i], extract: () => ({}) },
  { id: "transcribe", patterns: [/(?:brace[,.]?\s+)?transcribe\s+(?:this\s+)?audio/i], extract: () => ({}) },
  { id: "explain_project", patterns: [/(?:brace[,.]?\s+)?explain\s+(?:this\s+)?project/i, /(?:brace[,.]?\s+)?describe\s+(?:this\s+)?(?:code|codebase|project)/i], extract: () => ({}) },
  { id: "reindex", patterns: [/(?:brace[,.]?\s+)?re-?index\s+(?:this\s+)?(?:codebase|project)/i, /(?:brace[,.]?\s+)?force\s+index/i], extract: () => ({}) },
  { id: "index", patterns: [/(?:brace[,.]?\s+)?index\s+(?:this\s+)?(?:codebase|project)/i], extract: () => ({}) },
  { id: "voicebox_status", patterns: [/(?:brace[,.]?\s+)?check\s+voicebox\s+status/i, /voicebox\s+status/i], extract: () => ({}) },
  { id: "gitnexus_status", patterns: [/(?:brace[,.]?\s+)?check\s+gitnexus\s+status/i, /gitnexus\s+status/i], extract: () => ({}) },
];

/**
 * Detect if a message contains a recognized B.R.A.C.E command.
 * @param {string} message - User message
 * @returns {{ isCommand: boolean, command?: string, args?: object }}
 */
function detectCommand(message) {
  if (!message || typeof message !== "string") return { isCommand: false };
  const clean = message.trim();
  for (const cmd of COMMANDS) {
    for (const pattern of cmd.patterns) {
      const match = clean.match(pattern);
      if (match) {
        return { isCommand: true, command: cmd.id, args: cmd.extract(match) };
      }
    }
  }
  return { isCommand: false };
}

/**
 * Execute a detected command.
 * @param {object} detected - Output from detectCommand
 * @param {object} deps - { voiceboxProvider, gitnexusTools, lastResponse, logger }
 * @returns {Promise<{ok: boolean, result: string, action?: string}>}
 */
async function executeCommand(detected, deps = {}) {
  const { command, args } = detected;
  const { voiceboxProvider, gitnexusTools, lastResponse, logger } = deps;

  try {
    switch (command) {
      case "speak": {
        if (!voiceboxProvider) return { ok: false, result: "Voicebox provider not available.", action: "speak" };
        const res = await voiceboxProvider.speak(args.text);
        if (res.ok) return { ok: true, result: `Speaking: "${args.text.slice(0, 80)}..."`, action: "speak" };
        return { ok: false, result: res.error, action: "speak" };
      }

      case "read_last": {
        if (!lastResponse) return { ok: false, result: "No previous response to read.", action: "read_last" };
        if (!voiceboxProvider) return { ok: false, result: "Voicebox provider not available.", action: "read_last" };
        const res = await voiceboxProvider.speak(lastResponse);
        if (res.ok) return { ok: true, result: "Reading the last response aloud.", action: "read_last" };
        return { ok: false, result: res.error, action: "read_last" };
      }

      case "transcribe": {
        return { ok: true, result: "Transcription mode activated. Please speak or provide an audio file.", action: "transcribe" };
      }

      case "explain_project": {
        if (!gitnexusTools) return { ok: false, result: "GitNexus tools not available.", action: "explain_project" };
        const status = await gitnexusTools.getStatus(process.cwd());
        if (status.indexed) {
          return { ok: true, result: `Project is indexed by GitNexus. Use the GitNexus MCP tools to query architecture, impact analysis, and code context.\n\nStatus:\n${status.output}`, action: "explain_project" };
        }
        return { ok: true, result: "Project is not yet indexed. Run 'brace, index this codebase' first.", action: "explain_project" };
      }

      case "index": {
        if (!gitnexusTools) return { ok: false, result: "GitNexus tools not available.", action: "index" };
        const res = await gitnexusTools.analyzeProject(process.cwd());
        if (res.ok) return { ok: true, result: `Codebase indexed successfully.\n${res.output}`, action: "index" };
        return { ok: false, result: `Indexing failed: ${res.error}`, action: "index" };
      }

      case "reindex": {
        if (!gitnexusTools) return { ok: false, result: "GitNexus tools not available.", action: "reindex" };
        const res = await gitnexusTools.reindexProject(process.cwd());
        if (res.ok) return { ok: true, result: `Codebase re-indexed successfully.\n${res.output}`, action: "reindex" };
        return { ok: false, result: `Re-indexing failed: ${res.error}`, action: "reindex" };
      }

      case "voicebox_status": {
        if (!voiceboxProvider) return { ok: false, result: "Voicebox provider not loaded.", action: "voicebox_status" };
        const health = await voiceboxProvider.healthCheck();
        if (health.ok) {
          return { ok: true, result: `Voicebox is running ✓\nURL: ${health.details.url}\nProfiles: ${health.details.profileCount}`, action: "voicebox_status" };
        }
        return { ok: false, result: `Voicebox is ${health.status}. ${health.details?.error || "Start Voicebox and try again."}`, action: "voicebox_status" };
      }

      case "gitnexus_status": {
        if (!gitnexusTools) return { ok: false, result: "GitNexus tools not available.", action: "gitnexus_status" };
        const res = await gitnexusTools.getStatus(process.cwd());
        if (res.ok) return { ok: true, result: `GitNexus status:\n${res.output}\nIndexed: ${res.indexed ? "Yes" : "No"}`, action: "gitnexus_status" };
        return { ok: false, result: `GitNexus check failed: ${res.error}`, action: "gitnexus_status" };
      }

      default:
        return { ok: false, result: `Unknown command: ${command}`, action: command };
    }
  } catch (err) {
    if (logger) logger.log("command", `Command failed: ${command}`, { error: err.message }, "medium", "error");
    return { ok: false, result: `Command error: ${err.message}`, action: command };
  }
}

module.exports = { detectCommand, executeCommand, COMMANDS };
