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

export function useAudioRecorder({
  config,
  onError,
  onFinalTranscript,
  onPartialTranscript,
  onVoiceEnd,
  onVoiceStart,
}: RecorderOptions) {
  const [listening, setListening] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const animationRef = useRef(0);
  const silenceTimerRef = useRef<number | null>(null);
  const speechStartedAtRef = useRef(0);
  const lastTranscriptRef = useRef("");
  const fallbackTranscriptRef = useRef("");

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
    
    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    // Stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
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
      if (!analyserRef.current) return;
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

  const getSupportedMimeType = (): { mimeType: string; extension: string } => {
    const types = [
      { mime: "audio/webm;codecs=opus", ext: "webm" },
      { mime: "audio/webm", ext: "webm" },
      { mime: "audio/ogg;codecs=opus", ext: "ogg" },
      { mime: "audio/wav", ext: "wav" },
      { mime: "audio/mp4", ext: "m4a" }
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type.mime)) {
        return { mimeType: type.mime, extension: type.ext };
      }
    }
    return { mimeType: "", extension: "wav" }; // Fallback default
  };

  const start = useCallback(async () => {
    cleanup();
    audioChunksRef.current = [];
    fallbackTranscriptRef.current = "";
    lastTranscriptRef.current = "";

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

      // SNIFF MIME TYPES FOR MEDIA RECORDER
      const { mimeType, extension } = getSupportedMimeType();
      console.log(`[AudioRecorder] Sniffed MIME type: "${mimeType}", Extension: "${extension}", Sample Rate: ${audioContext.sampleRate}Hz`);

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/wav" });
        const arrayBuffer = await audioBlob.arrayBuffer();
        
        // 1. TRY VOICEBOX STT FIRST
        if (config.voiceProvider === "voicebox" && window.braceDesktop?.voiceboxTranscribe) {
          try {
            console.log(`[AudioRecorder] Sending ${audioBlob.size} bytes of "${audioBlob.type}" audio to Voicebox STT...`);
            const status = await window.braceDesktop.voiceboxStatus();
            
            if (status.voiceboxConnected) {
              const res = await window.braceDesktop.voiceboxTranscribe({
                audioBuffer: arrayBuffer,
                options: { format: extension }
              });
              if (res.ok && res.text) {
                console.log(`[AudioRecorder] Voicebox transcription succeeded: "${res.text}"`);
                onFinalTranscript(res.text);
                return;
              }
            }
          } catch (err: any) {
            console.warn(`[AudioRecorder] Voicebox STT call failed: ${err.message}. Falling back to browser SpeechRecognition.`);
          }
        }

        // 2. FALLBACK TO BROWSER TRANSCRIPT
        console.log(`[AudioRecorder] Using browser fallback transcription: "${fallbackTranscriptRef.current}"`);
        if (fallbackTranscriptRef.current) {
          onFinalTranscript(fallbackTranscriptRef.current);
        } else {
          onError?.("No transcription returned. Check voice settings or start Voicebox server.");
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Capture in 250ms chunks

      // Start Browser Speech Recognition in parallel for real-time partial feedback
      const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
      const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
      
      if (Recognition) {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = config.language || "en-IN";
        
        recognition.onresult = (event) => {
          const text = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ").trim();
          if (!text) return;
          onPartialTranscript?.(text);
          fallbackTranscriptRef.current = text;
          
          const last = event.results[event.results.length - 1];
          if (last?.isFinal && text !== lastTranscriptRef.current) {
            lastTranscriptRef.current = text;
          }
        };

        recognition.onerror = () => {
          console.warn("[AudioRecorder] SpeechRecognition error");
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      // Max recording timeout safety
      window.setTimeout(() => {
        if (streamRef.current) {
          onError?.("Max recording time reached.");
          cleanup();
        }
      }, config.maxRecordingMs);

    } catch (error) {
      cleanup();
      onError?.(error instanceof Error ? `Microphone failed: ${error.message}` : "Microphone failed.");
    }
  }, [cleanup, config.continuousListening, config.language, config.maxRecordingMs, config.voiceProvider, monitorVolume, onError, onFinalTranscript, onPartialTranscript, refreshDevices, selectedDeviceId]);

  return { devices, listening, refreshDevices, selectedDeviceId, setSelectedDeviceId, start, stop: cleanup, volumeLevel };
}
export default useAudioRecorder;
