function extractResponseText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const chunks = [];
  for (const item of data?.output || []) {
    for (const part of item?.content || []) {
      if ((part?.type === "output_text" || part?.type === "text") && part?.text) chunks.push(part.text);
    }
  }
  return chunks.join("\n").trim();
}

function extractResponseSources(data) {
  const seen = new Set();
  const sources = [];
  for (const item of data?.output || []) {
    for (const part of item?.content || []) {
      for (const annotation of part?.annotations || []) {
        const citation = annotation?.type === "url_citation" ? annotation : annotation?.url_citation;
        const url = citation?.url;
        if (!url || seen.has(url)) continue;
        seen.add(url);
        sources.push({ url, title: citation?.title || url });
      }
    }
  }
  return sources;
}

async function callOpenAIResponses(settings, prompt, options = {}) {
  const apiKey = settings.openAiApiKey || settings.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key is not saved.");

  const model = options.model || "gpt-5.6-luna";
  const effort = options.effort || "high";
  const mode = options.mode || "standard";
  const body = {
    model,
    instructions: options.instructions || "You are B.R.A.C.E, a precise local-first desktop assistant.",
    input: prompt,
    reasoning: { effort, mode },
    max_output_tokens: options.maxOutputTokens || Math.max(800, Number(settings.maxTokens || 1800)),
  };
  if (Array.isArray(options.tools) && options.tools.length) body.tools = options.tools;
  if (options.toolChoice) body.tool_choice = options.toolChoice;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI Responses HTTP ${response.status}`);

  const text = extractResponseText(data);
  if (!text) throw new Error("OpenAI Responses returned no text.");
  return { text, sources: extractResponseSources(data), responseId: data.id, model, effort, mode, usage: data.usage || null };
}

module.exports = { callOpenAIResponses, extractResponseSources, extractResponseText };
