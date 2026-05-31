import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatMessage, VoiceConfig, VoiceOrbState, VoiceStatus } from "../types";
import { mergeVoiceConfig } from "./voiceStateStore";
import { useAudioPlayer } from "./useAudioPlayer";
import { useAudioRecorder } from "./useAudioRecorder";

type UseVoiceAgentArgs = {
  sendCommand: (command: string) => Promise<string>;
  addMessage: (message: ChatMessage) => void;
};

export function useVoiceAgent({ addMessage, sendCommand }: UseVoiceAgentArgs) {
  const [config, setConfig] = useState<VoiceConfig>(mergeVoiceConfig());
  const [status, setStatus] = useState<VoiceStatus | null>(null);
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [error, setError] = useState("");

  const { speak, speaking, stop: stopSpeaking, voices } = useAudioPlayer(config);

  const refreshVoiceStatus = useCallback(async () => {
    const [nextConfig, nextStatus] = await Promise.all([
      window.braceDesktop?.getVoiceConfig?.() as Promise<VoiceConfig | undefined>,
      window.braceDesktop?.voiceStatus?.() as Promise<VoiceStatus | undefined>,
    ]);
    if (nextConfig) setConfig(mergeVoiceConfig(nextConfig));
    if (nextStatus) setStatus(nextStatus);
  }, []);

  useEffect(() => {
    void refreshVoiceStatus();
  }, [refreshVoiceStatus]);

  const updateConfig = useCallback(async (patch: Partial<VoiceConfig>) => {
    const next = mergeVoiceConfig({ ...config, ...patch });
    setConfig(next);
    await window.braceDesktop?.updateVoiceConfig?.(patch);
    await window.braceDesktop?.logVoiceEvent?.({ type: "voice mode changed", detail: patch });
    await refreshVoiceStatus();
  }, [config, refreshVoiceStatus]);

  const stopAllAudio = useCallback(() => {
    stopSpeaking();
    setOrbState(config.volume <= 0 ? "muted" : "idle");
    void window.braceDesktop?.logVoiceEvent?.({ type: "TTS stopped", detail: { reason: "manual_or_interruption" } });
  }, [config.volume, stopSpeaking]);

  const handleTranscript = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || clean === transcript.trim()) return;
    setTranscript(clean);
    setPartialTranscript("");
    setOrbState("thinking");
    await window.braceDesktop?.logVoiceEvent?.({ type: "transcript created", detail: { length: clean.length } });
    addMessage({ id: Date.now(), role: "user", text: clean, source: "agent" });
    const response = await sendCommand(clean);
    setLastResponse(response);
    setOrbState(config.volume <= 0 ? "muted" : "speaking");
    await window.braceDesktop?.logVoiceEvent?.({ type: "TTS started", detail: { provider: status?.ttsProvider ?? "browser-fallback" } });
    await speak(response, {
      onStart: () => setOrbState("speaking"),
      onEnd: () => setOrbState("idle"),
      onError: (message) => {
        setError(message);
        setOrbState("error");
      },
    });
  }, [addMessage, config.volume, sendCommand, speak, status?.ttsProvider, transcript]);

  const recorder = useAudioRecorder({
    config,
    onError: (message) => {
      setError(message);
      setOrbState("error");
      void window.braceDesktop?.logVoiceEvent?.({ type: "error occurred", detail: { message }, result: "error" });
    },
    onFinalTranscript: handleTranscript,
    onPartialTranscript: setPartialTranscript,
    onVoiceStart: () => {
      if (speaking && config.interruptionEnabled) {
        stopSpeaking();
        void window.braceDesktop?.logVoiceEvent?.({ type: "user interrupted", detail: {} });
      }
      setOrbState("listening");
    },
    onVoiceEnd: () => {
      setOrbState("thinking");
    },
  });

  const startListening = useCallback(async () => {
    setError("");
    if (speaking && config.interruptionEnabled) stopSpeaking();
    setOrbState("listening");
    await window.braceDesktop?.logVoiceEvent?.({ type: "mic started", detail: { mode: config.mode } });
    await recorder.start();
  }, [config.interruptionEnabled, config.mode, recorder, speaking, stopSpeaking]);

  const stopListening = useCallback(() => {
    recorder.stop();
    setOrbState("idle");
    void window.braceDesktop?.logVoiceEvent?.({ type: "mic stopped", detail: {} });
  }, [recorder]);

  const previewVoice = useCallback(async () => {
    const sample = "B.R.A.C.E voice online. I am ready to listen, think, and respond.";
    setOrbState("speaking");
    await speak(sample, { onEnd: () => setOrbState("idle"), onError: setError });
  }, [speak]);

  const replayLast = useCallback(async () => {
    if (!lastResponse) return;
    setOrbState("speaking");
    await speak(lastResponse, { onEnd: () => setOrbState("idle"), onError: setError });
  }, [lastResponse, speak]);

  const browserVoiceOptions = useMemo(() => voices.map((voice) => ({ id: voice.name, label: voice.name, description: `${voice.lang}${voice.localService ? " local" : ""}` })), [voices]);

  return {
    ...recorder,
    browserVoiceOptions,
    config,
    error,
    lastResponse,
    orbState: recorder.listening ? "listening" as VoiceOrbState : speaking ? "speaking" as VoiceOrbState : orbState,
    partialTranscript,
    previewVoice,
    refreshVoiceStatus,
    replayLast,
    setError,
    startListening,
    status,
    stopAllAudio,
    stopListening,
    transcript,
    updateConfig,
  };
}
