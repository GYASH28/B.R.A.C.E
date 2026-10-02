import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatMessage, VoiceConfig, VoiceOrbState, VoiceStatus } from "../types";
import { mergeVoiceConfig } from "./voiceStateStore";
import { useAudioPlayer } from "./useAudioPlayer";
import { useAudioRecorder } from "./useAudioRecorder";
import { useGPTLive } from "../live/useGPTLive";

type UseVoiceAgentArgs = {
  sendCommand: (command: string) => Promise<string>;
  addMessage: (message: ChatMessage) => void;
  history?: ChatMessage[];
  workspacePath?: string;
  autoStart?: boolean;
};

export function useVoiceAgent({ addMessage, sendCommand, history = [], workspacePath = "", autoStart = false }: UseVoiceAgentArgs) {
  const [config, setConfig] = useState<VoiceConfig>(mergeVoiceConfig());
  const [status, setStatus] = useState<VoiceStatus | null>(null);
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [error, setError] = useState("");

  const { speak, speaking, stop: stopSpeaking, voices } = useAudioPlayer(config);
  const liveMode = config.onlineVoiceEnabled || config.mode === "online-high-quality";
  const live = useGPTLive({ history, workspacePath });

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
    if (liveMode && (live.connected || live.connecting)) live.disconnect();
    stopSpeaking();
    setOrbState(config.volume <= 0 ? "muted" : "idle");
    void window.braceDesktop?.logVoiceEvent?.({ type: "TTS stopped", detail: { reason: "manual_or_interruption" } });
  }, [config.volume, live.connected, live.connecting, live.disconnect, liveMode, stopSpeaking]);

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
    await window.braceDesktop?.logVoiceEvent?.({ type: "mic started", detail: { mode: config.mode, live: liveMode } });
    if (liveMode) {
      setOrbState("thinking");
      try {
        await live.connect();
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "GPT-Live failed to connect.";
        setError(message);
        setOrbState("error");
      }
      return;
    }
    setOrbState("listening");
    await recorder.start();
  }, [config.interruptionEnabled, config.mode, live.connect, liveMode, recorder, speaking, stopSpeaking]);

  const stopListening = useCallback(() => {
    if (liveMode) live.disconnect();
    else recorder.stop();
    setOrbState("idle");
    void window.braceDesktop?.logVoiceEvent?.({ type: "mic stopped", detail: { live: liveMode } });
  }, [live.disconnect, liveMode, recorder]);

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

  useEffect(() => {
    if (!autoStart || !liveMode || live.connected || live.connecting) return;
    const timer = window.setTimeout(() => void startListening(), 450);
    return () => window.clearTimeout(timer);
  }, [autoStart, live.connected, live.connecting, liveMode, startListening]);

  return {
    ...recorder,
    browserVoiceOptions,
    config,
    error: liveMode ? (live.error || error) : error,
    isLiveMode: liveMode,
    lastResponse: liveMode ? live.outputTranscript : lastResponse,
    liveConnected: live.connected,
    liveSessionId: live.sessionId,
    orbState: liveMode
      ? live.orbState
      : recorder.listening
        ? "listening" as VoiceOrbState
        : speaking
          ? "speaking" as VoiceOrbState
          : orbState,
    partialTranscript: liveMode ? live.inputTranscript : partialTranscript,
    previewVoice,
    refreshVoiceStatus,
    replayLast,
    setError,
    startListening,
    status,
    stopAllAudio,
    stopListening,
    transcript: liveMode ? live.inputTranscript : transcript,
    updateConfig,
    volumeLevel: liveMode ? live.volumeLevel : recorder.volumeLevel,
  };
}
