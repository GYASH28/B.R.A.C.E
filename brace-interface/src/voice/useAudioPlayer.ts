import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceConfig } from "../types";

type SpeakOptions = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
};

const presetTuning: Record<string, { rate: number; pitch: number }> = {
  "brace-default": { rate: 0.98, pitch: 0.92 },
  "calm-assistant": { rate: 0.86, pitch: 0.95 },
  "deep-futuristic": { rate: 0.92, pitch: 0.72 },
  "fast-coding": { rate: 1.14, pitch: 0.98 },
  "study-mode": { rate: 0.94, pitch: 1.02 },
  "indian-english": { rate: 0.96, pitch: 1 },
};

function sentenceChunks(text: string) {
  return text
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 12) ?? [];
}

export function useAudioPlayer(config: VoiceConfig) {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const queueIdRef = useRef(0);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    queueIdRef.current += 1;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, options: SpeakOptions = {}) => {
      const clean = text.replace(/Route:.*$/s, "").trim();
      if (!clean || !("speechSynthesis" in window)) {
        options.onError?.("Browser speech synthesis is unavailable.");
        return;
      }
      stop();
      const queueId = queueIdRef.current;
      const tuning = presetTuning[config.stylePreset] ?? presetTuning["brace-default"];
      const chunks = sentenceChunks(clean);
      setSpeaking(true);
      options.onStart?.();

      for (const chunk of chunks) {
        if (queueId !== queueIdRef.current) break;
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(chunk);
          utterance.lang = config.language || "en-IN";
          utterance.rate = Math.max(0.6, Math.min(1.6, config.speed * tuning.rate));
          utterance.pitch = Math.max(0.4, Math.min(1.8, config.pitch * tuning.pitch));
          utterance.volume = Math.max(0, Math.min(1, config.volume));
          const preferred = voices.find((voice) => voice.name === config.selectedVoice) ?? voices.find((voice) => /natural|online|zira|aria|female|english/i.test(voice.name));
          if (preferred) utterance.voice = preferred;
          utterance.onend = () => resolve();
          utterance.onerror = () => {
            options.onError?.("Audio playback failed. Try Browser Fallback mode or another voice.");
            resolve();
          };
          window.speechSynthesis.speak(utterance);
        });
      }

      if (queueId === queueIdRef.current) {
        setSpeaking(false);
        options.onEnd?.();
      }
    },
    [config.language, config.pitch, config.selectedVoice, config.speed, config.stylePreset, config.volume, stop, voices],
  );

  return { speak, speaking, stop, voices };
}
