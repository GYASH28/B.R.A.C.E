import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceConfig } from "../types";

type RecorderOptions = {
  config: VoiceConfig;
  onFinalTranscript: (text: string) => void;
  onPartialTranscript?: (text: string) => void;
  onError?: (message: string) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognition;

export function useAudioRecorder({ config, onError, onFinalTranscript, onPartialTranscript, onVoiceEnd, onVoiceStart }: RecorderOptions) {
  const [listening, setListening] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const animationRef = useRef(0);
  const silenceTimerRef = useRef<number | null>(null);
  const speechStartedAtRef = useRef(0);
  const lastTranscriptRef = useRef("");

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    setDevices(all.filter((device) => device.kind === "audioinput"));
  }, []);

  const cleanup = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = 0;
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    setListening(false);
    setVolumeLevel(0);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const monitorVolume = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const value of data) {
        const centered = (value - 128) / 128;
        sum += centered * centered;
      }
      const rms = Math.sqrt(sum / data.length);
      const nextVolume = Math.min(1, rms * 8);
      setVolumeLevel(nextVolume);
      if (nextVolume > config.vadSensitivity) {
        if (!speechStartedAtRef.current) {
          speechStartedAtRef.current = performance.now();
          onVoiceStart?.();
        }
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      } else if (speechStartedAtRef.current && !silenceTimerRef.current) {
        silenceTimerRef.current = window.setTimeout(() => {
          const duration = performance.now() - speechStartedAtRef.current;
          speechStartedAtRef.current = 0;
          onVoiceEnd?.();
          if (duration >= config.minSpeechMs && !config.continuousListening) cleanup();
        }, config.silenceTimeoutMs);
      }
      animationRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [cleanup, config.continuousListening, config.minSpeechMs, config.silenceTimeoutMs, config.vadSensitivity, onVoiceEnd, onVoiceStart]);

  const start = useCallback(async () => {
    cleanup();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      await refreshDevices();

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      setListening(true);
      monitorVolume();

      const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
      const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
      if (!Recognition) {
        onError?.("Speech recognition is unavailable. Browser Fallback mode needs Chromium speech support; type the transcript manually.");
        return;
      }
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = config.language || "en-IN";
      recognition.onresult = (event) => {
        const text = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ").trim();
        if (!text) return;
        onPartialTranscript?.(text);
        const last = event.results[event.results.length - 1];
        if (last?.isFinal && text !== lastTranscriptRef.current) {
          lastTranscriptRef.current = text;
          onFinalTranscript(text);
          if (!config.continuousListening) cleanup();
        }
      };
      recognition.onerror = () => onError?.("Speech recognition failed. Try again, check microphone permission, or switch fallback mode.");
      recognition.onend = () => {
        if (streamRef.current && config.continuousListening) recognition.start();
      };
      recognitionRef.current = recognition;
      recognition.start();
      window.setTimeout(() => {
        if (streamRef.current) {
          onError?.("Max recording time reached. Stopping microphone.");
          cleanup();
        }
      }, config.maxRecordingMs);
    } catch (error) {
      cleanup();
      onError?.(error instanceof Error ? `Microphone failed: ${error.message}` : "Microphone failed.");
    }
  }, [cleanup, config.continuousListening, config.language, config.maxRecordingMs, monitorVolume, onError, onFinalTranscript, onPartialTranscript, refreshDevices, selectedDeviceId]);

  return { devices, listening, refreshDevices, selectedDeviceId, setSelectedDeviceId, start, stop: cleanup, volumeLevel };
}
