import type { VoiceConfig, VoiceOrbState } from "../types";

export const defaultVoiceConfig: VoiceConfig = {
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
  voiceProvider: "voicebox",
  voiceboxBaseUrl: "http://127.0.0.1:17493",
  voiceboxDefaultProfile: "",
};

export const voiceStateLabel: Record<VoiceOrbState, string> = {
  idle: "Local voice ready",
  listening: "Listening...",
  thinking: "Thinking...",
  speaking: "Speaking...",
  error: "Voice error",
  muted: "Voice muted",
  offline: "Voice offline",
};

export function mergeVoiceConfig(config?: Partial<VoiceConfig>): VoiceConfig {
  return { ...defaultVoiceConfig, ...(config ?? {}) };
}
