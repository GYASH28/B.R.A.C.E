const { runSubagent } = require("../agents/subagentManager.cjs");

function getApiKey(settings) {
  return settings.openAiApiKey || settings.apiKey || process.env.OPENAI_API_KEY || "";
}

async function createLiveSession(settings, { sdp, history = [] } = {}) {
  const apiKey = getApiKey(settings);
  if (!apiKey) throw new Error("OpenAI API key is required for GPT-Live.");
  if (!sdp) throw new Error("WebRTC offer SDP is missing.");

  const input = (Array.isArray(history) ? history : [])
    .slice(-24)
    .filter((message) => message?.text && ["user", "assistant"].includes(message.role))
    .map((message) => ({
      type: "message",
      role: message.role,
      content: [{
        type: message.role === "assistant" ? "output_text" : "input_text",
        text: String(message.text).slice(0, 4000),
      }],
    }));

  const body = {
    session: {
      model: "gpt-live-1",
      instructions: [
        "You are B.R.A.C.E, a fast, natural, voice-first desktop AI companion.",
        "Sound calm, capable, conversational and concise. Never narrate hidden reasoning.",
        "You can keep talking naturally while delegated work happens.",
        "Delegate tasks that need research, coding, planning, files, apps, system actions, email, calendar, Git, or deeper reasoning to the client.",
        "For simple conversation, answer directly.",
        "Never claim an external or local action completed until the client sends a confirmed result.",
        "When a delegated result arrives, explain it naturally rather than reading raw metadata.",
      ].join("\n"),
      input,
      audio: { output: { voice: settings.voice?.liveVoice || settings.liveVoice || "vesper" } },
      delegation: { type: "client" },
      store: false,
    },
    transport: { type: "webrtc", sdp },
  };

  const response = await fetch("https://api.openai.com/v1/live/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `GPT-Live HTTP ${response.status}`);
  return data;
}

async function runLiveDelegation(settings, payload = {}) {
  const task = String(payload.task || "").trim();
  if (!task) throw new Error("Delegated task is empty.");
  return runSubagent({
    settings,
    task,
    context: {
      recentConversation: payload.recentConversation || "",
      workspacePath: payload.workspacePath || "",
    },
    requestedAgent: payload.requestedAgent,
  });
}

module.exports = { createLiveSession, runLiveDelegation };
