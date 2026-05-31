
const DEFAULT_VOICE_CONFIG = {
  mode: "best-local",
  sttProvider: "faster-whisper",
  ttsProvider: "kokoro",
  vadProvider: "silero",
  selectedVoice: "brace-default",
  language: "en-IN",
  speed: 1,
  pitch: 1,
  volume: 0.9,
  stylePreset: "brace-default",
  vadSensitivity: 0.045,
  silenceTimeoutMs: 900,
  minSpeechMs: 300,
  maxRecordingMs: 45000,
  interruptionEnabled: true,
  wakeWordEnabled: false,
  continuousListening: false,
  onlineVoiceEnabled: false,
  saveRawAudio: false,
  saveTranscripts: false,
  voiceProvider: process.env.VOICE_PROVIDER || "voicebox",
  voiceboxBaseUrl: process.env.VOICEBOX_BASE_URL || "http://127.0.0.1:17493",
  voiceboxDefaultProfile: process.env.VOICEBOX_DEFAULT_PROFILE || "",
};

const VOICE_PRESETS = [
  { id: "brace-default", label: "B.R.A.C.E Default", description: "Balanced, calm, futuristic assistant tone." },
  { id: "calm-assistant", label: "Calm Assistant", description: "Slower and softer for planning and focus." },
  { id: "deep-futuristic", label: "Deep Futuristic", description: "Lower pitch for a cinematic assistant tone." },
  { id: "fast-coding", label: "Fast Coding Helper", description: "Faster delivery for coding feedback." },
  { id: "study-mode", label: "Study Mode", description: "Clear, steady explanations for learning." },
  { id: "indian-english", label: "Hindi/Indian English Friendly", description: "Optimized language defaults for Indian English commands." },
];

function mergeVoiceConfig(current = {}, patch = {}) {
  return { ...DEFAULT_VOICE_CONFIG, ...current, ...patch };
}

module.exports = { DEFAULT_VOICE_CONFIG, VOICE_PRESETS, mergeVoiceConfig };
