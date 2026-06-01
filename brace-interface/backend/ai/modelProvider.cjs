async function callGemini(settings, prompt, context = {}) {
  const key = settings.geminiKey || settings.apiKey;
  if (!key) throw new Error("Gemini API key is not saved.");
  const model = settings.model && settings.aiProvider === "gemini" ? settings.model : "gemini-2.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${context.systemPrompt || ""}\n\nUser request: ${prompt}` }] }],
      generationConfig: { temperature: settings.temperature ?? 0.35, maxOutputTokens: settings.maxTokens ?? 1200 },
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
  return data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("").trim();
}

async function callOpenAiCompatible(settings, prompt, context = {}) {
  const base = settings.openAiBaseUrl || settings.baseUrl;
  if (!base) throw new Error("OpenAI-compatible base URL is missing.");
  const url = new URL(base.endsWith("/chat/completions") ? base : "/v1/chat/completions", base).toString();
  const key = settings.openAiApiKey || settings.apiKey;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({
      model: settings.openAiModel || settings.model || "local-model",
      messages: [
        { role: "system", content: context.systemPrompt || "You are B.R.A.C.E." },
        { role: "user", content: prompt },
      ],
      temperature: settings.temperature ?? 0.35,
      max_tokens: settings.maxTokens ?? 1200,
      stream: false,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI-compatible HTTP ${response.status}`);
  return data?.choices?.[0]?.message?.content?.trim();
}

async function callOllama(settings, prompt, context = {}) {
  const endpoint = settings.ollamaEndpoint || settings.baseUrl || "http://127.0.0.1:11434";
  const response = await fetch(new URL("/api/generate", endpoint).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.ollamaModel || settings.model || "llama3.2",
      system: context.systemPrompt,
      prompt,
      stream: false,
      options: { temperature: settings.temperature ?? 0.35, num_predict: settings.maxTokens ?? 1200 },
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `Ollama HTTP ${response.status}`);
  return data?.response?.trim();
}

async function callCustomEndpoint(settings, prompt, context = {}) {
  if (!settings.customEndpoint && !settings.baseUrl) throw new Error("Custom endpoint is missing.");
  const response = await fetch(settings.customEndpoint || settings.baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}) },
    body: JSON.stringify({ message: prompt, prompt, system: context.systemPrompt, model: settings.model }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `Custom endpoint HTTP ${response.status}`);
  return data?.text || data?.response || data?.message || JSON.stringify(data);
}

module.exports = { callCustomEndpoint, callGemini, callOllama, callOpenAiCompatible };
