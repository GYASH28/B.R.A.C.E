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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
    };
  }, []);

  const stop = useCallback(() => {
    queueIdRef.current += 1;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
    setSpeaking(false);
  }, []);

  // Helper for browser speech synthesis fallback
  const playBrowserFallback = useCallback(
    async (cleanText: string, options: SpeakOptions) => {
      console.log("[AudioPlayer] Falling back to browser SpeechSynthesis...");
      const queueId = queueIdRef.current;
      const tuning = presetTuning[config.stylePreset] ?? presetTuning["brace-default"];
      const chunks = sentenceChunks(cleanText);
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
          const preferred =
            voices.find((voice) => voice.name === config.selectedVoice) ??
            voices.find((voice) => /natural|online|zira|aria|female|english/i.test(voice.name));
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
    [config.language, config.pitch, config.selectedVoice, config.speed, config.stylePreset, config.volume, voices]
  );

  const speak = useCallback(
    async (text: string, options: SpeakOptions = {}) => {
      const clean = text.replace(/Route:.*$/s, "").trim();
      if (!clean) {
        options.onError?.("Empty text provided for playback.");
        return;
      }
      
      stop();
      const queueId = queueIdRef.current;

      // 1. VOICEBOX TTS (PRIMARY)
      if (config.voiceProvider === "voicebox" && window.braceDesktop?.voiceboxSpeak) {
        try {
          console.log(`[AudioPlayer] Attempting Voicebox TTS for: "${clean.slice(0, 60)}..."`);
          const status = await window.braceDesktop.voiceboxStatus();
          
          if (status.voiceboxConnected) {
            setSpeaking(true);
            options.onStart?.();

            const res = await window.braceDesktop.voiceboxSpeak({
              text: clean,
              options: {
                profile: config.selectedVoice,
                speed: config.speed,
                pitch: config.pitch,
              },
            });

            if (queueId !== queueIdRef.current) return;

            if (res.ok) {
              let audioUrl: string | null = null;

              if (res.format === "buffer" && res.audio) {
                // res.audio is Uint8Array/ArrayBuffer from Electron IPC
                const blob = new Blob([res.audio], { type: "audio/wav" });
                audioUrl = URL.createObjectURL(blob);
                currentBlobUrlRef.current = audioUrl;
              } else if (res.format === "base64" && res.audio) {
                const binaryStr = window.atob(res.audio);
                const len = binaryStr.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                  bytes[i] = binaryStr.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: "audio/wav" });
                audioUrl = URL.createObjectURL(blob);
                currentBlobUrlRef.current = audioUrl;
              } else if (res.format === "url" && res.url) {
                audioUrl = res.url;
              } else if (res.format === "file" && res.filePath) {
                // Read from local filepath if possible, but backend should have handled it.
                // In case it comes as a filepath, try using file:// protocol (might be blocked)
                audioUrl = `file:///${res.filePath.replace(/\\/g, "/")}`;
              }

              if (audioUrl) {
                const audio = new Audio(audioUrl);
                audioRef.current = audio;
                audio.volume = config.volume;
                
                audio.onended = () => {
                  if (queueId === queueIdRef.current) {
                    setSpeaking(false);
                    options.onEnd?.();
                  }
                  if (audioUrl?.startsWith("blob:") && currentBlobUrlRef.current === audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                    currentBlobUrlRef.current = null;
                  }
                };

                audio.onerror = (e) => {
                  console.warn("[AudioPlayer] Audio element error, falling back to browser TTS", e);
                  if (audioUrl?.startsWith("blob:") && currentBlobUrlRef.current === audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                    currentBlobUrlRef.current = null;
                  }
                  if (queueId === queueIdRef.current) {
                    void playBrowserFallback(clean, options);
                  }
                };

                await audio.play().catch((playErr) => {
                  console.warn("[AudioPlayer] Audio play failed, falling back to browser TTS", playErr);
                  if (queueId === queueIdRef.current) {
                    void playBrowserFallback(clean, options);
                  }
                });
                return;
              }
            } else {
              console.warn(`[AudioPlayer] Voicebox TTS returned error: ${res.error}. Falling back.`);
            }
          }
        } catch (err: any) {
          console.warn(`[AudioPlayer] Voicebox TTS failed: ${err.message}. Falling back.`);
        }
      }

      // 2. BROWSER TTS FALLBACK
      if (queueId === queueIdRef.current) {
        if (!("speechSynthesis" in window)) {
          options.onError?.("Browser speech synthesis is unavailable.");
          setSpeaking(false);
          return;
        }
        await playBrowserFallback(clean, options);
      }
    },
    [config.voiceProvider, config.selectedVoice, config.speed, config.pitch, config.volume, stop, playBrowserFallback]
  );

  return { speak, speaking, stop, voices };
}

