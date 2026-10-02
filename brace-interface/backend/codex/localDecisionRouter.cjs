function normalize(command) {
  return String(command || "").trim().toLowerCase();
}

function routeLocalDecision(command) {
  const text = normalize(command);
  const words = text.split(/\s+/).filter(Boolean);
  const has = (pattern) => pattern.test(text);

  let category = "conversation";
  if (has(/\b(research|search the web|latest|current|look up|find online)\b/)) category = "research";
  else if (has(/\b(debug|bug|code|repo|repository|build|test|typescript|javascript|react|electron|git|refactor|implement|fix)\b/)) category = "coding";
  else if (has(/\b(memory|second brain|obsidian|remember|note|notes|vault)\b/)) category = "memory";
  else if (has(/\b(file|folder|directory|download|document|pdf)\b/)) category = "files";
  else if (has(/\b(open|launch|start|ram|cpu|system|process|app|application)\b/)) category = "system";
  else if (has(/\b(plan|schedule|prioriti[sz]e|roadmap)\b/)) category = "planning";

  let score = 0;
  if (words.length > 55) score += 1;
  if (words.length > 180) score += 2;
  if (has(/\b(deep|complete|production|architecture|root cause|security|audit|complex|multi[- ]step|refactor|migration)\b/)) score += 2;
  if (has(/\b(review|verify|benchmark|investigate)\b/)) score += 1;
  if (category === "coding" || category === "research") score += 1;

  const profile = score >= 4 ? "DEEP" : score >= 2 ? "NORMAL" : "FAST";
  const needsMemory = category === "memory" || has(/\b(my|our|previous|earlier|remember|second brain|project context)\b/);
  const networkAccess = category === "research" || has(/\b(web|online|latest|current|internet)\b/);

  return {
    category,
    profile,
    complexity: score,
    needsMemory,
    networkAccess,
    shouldShowAgents: profile === "DEEP",
  };
}

module.exports = { routeLocalDecision };
