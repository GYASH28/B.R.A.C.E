const { AGENTS } = require("./catalog.cjs");

const MODEL_BY_TIER = {
  luna: "gpt-5.6-luna",
  terra: "gpt-5.6-terra",
  sol: "gpt-5.6-sol",
};

function scoreAgent(agent, text) {
  if (!agent.keywords?.length) return agent.id === "conductor" ? 0.2 : 0;
  return agent.keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);
}

function complexityScore(command) {
  const text = String(command || "").toLowerCase();
  let score = 0;
  if (text.length > 500) score += 1;
  if (text.length > 1400) score += 1;
  for (const term of ["deep", "complete", "production", "architecture", "root cause", "complex", "multi-step", "security", "audit", "debug"]) {
    if (text.includes(term)) score += 1;
  }
  return score;
}

function routeTask(command, requestedAgent) {
  const text = String(command || "").toLowerCase();
  let agent = requestedAgent ? AGENTS.find((item) => item.id === requestedAgent) : null;
  if (!agent) {
    agent = AGENTS
      .map((item) => ({ item, score: scoreAgent(item, text) }))
      .sort((a, b) => b.score - a.score)[0]?.item || AGENTS[0];
  }

  const complexity = complexityScore(command);
  let tier = agent.tier || "luna";

  if (complexity <= 1 && !["debugger", "architect", "security"].includes(agent.id)) tier = "luna";
  else if (complexity >= 4 || ["debugger", "architect", "security"].includes(agent.id)) tier = "sol";
  else if (tier === "luna") tier = "terra";

  return {
    agent,
    complexity,
    tier,
    model: MODEL_BY_TIER[tier],
    effort: tier === "sol" && complexity >= 5 ? "xhigh" : "high",
    mode: complexity >= 5 ? "pro" : "standard",
  };
}

module.exports = { MODEL_BY_TIER, complexityScore, routeTask };
