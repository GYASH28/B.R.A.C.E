const { callCustomEndpoint, callGemini, callOllama, callOpenAiCompatible } = require("./modelProvider.cjs");
const { buildSystemPrompt } = require("./systemPromptBuilder.cjs");

async function callProvider(settings, prompt, context = {}) {
  if (settings.offlineMode) throw new Error("Offline Mode is enabled.");
  const provider = settings.aiProvider || "ollama";
  const systemPrompt = buildSystemPrompt(context);
  if (provider === "gemini") return { provider, text: await callGemini(settings, prompt, { ...context, systemPrompt }) };
  if (provider === "openai" || provider === "openrouter" || provider === "lmstudio") {
    return { provider, text: await callOpenAiCompatible(settings, prompt, { ...context, systemPrompt }) };
  }
  if (provider === "ollama") return { provider, text: await callOllama(settings, prompt, { ...context, systemPrompt }) };
  if (provider === "custom") return { provider, text: await callCustomEndpoint(settings, prompt, { ...context, systemPrompt }) };
  throw new Error(`Unknown AI provider: ${provider}`);
}

async function testConnection(settings) {
  const result = await callProvider(settings, "Reply with exactly: B.R.A.C.E connection ok", {});
  return { ok: true, provider: result.provider, text: result.text };
}

module.exports = { callProvider, testConnection };
