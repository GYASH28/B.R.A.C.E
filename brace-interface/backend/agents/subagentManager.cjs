const { callOpenAIResponses } = require("../ai/openaiResponses.cjs");
const { routeTask } = require("./modelRouter.cjs");

function buildInstructions(route) {
  return [
    "You are a specialist inside B.R.A.C.E (Brain, Responsive, Agentic, Companion, Engine).",
    `Role: ${route.agent.name}. ${route.agent.description}`,
    "Be decisive, practical, and concise enough for a voice-first assistant.",
    "Do not claim that a local file, command, email, calendar event, browser action, or Git operation was changed unless the application confirms it.",
    "When an action is needed, describe the exact intended action so BRACE's permission-gated executor can perform it.",
    "Return the useful result first. Avoid filler.",
  ].join("\n");
}

function buildPrompt(task, context = {}) {
  const recent = String(context.recentConversation || "").slice(-7000);
  const workspace = context.workspacePath ? `Workspace: ${context.workspacePath}` : "";
  return [
    recent ? `Recent conversation:\n${recent}` : "",
    workspace,
    `Current task:\n${task}`,
  ].filter(Boolean).join("\n\n");
}

async function runSubagent({ settings, task, context = {}, requestedAgent }) {
  const route = routeTask(task, requestedAgent);
  const result = await callOpenAIResponses(settings, buildPrompt(task, context), {
    model: route.model,
    effort: route.effort,
    mode: route.mode,
    instructions: buildInstructions(route),
    maxOutputTokens: route.tier === "luna" ? 1800 : 3200,
  });

  return {
    ...result,
    agent: route.agent.id,
    agentName: route.agent.name,
    tier: route.tier,
    complexity: route.complexity,
  };
}

module.exports = { runSubagent };
