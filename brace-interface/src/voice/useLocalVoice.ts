import { useCallback, useEffect, useRef, useState } from "react";

type LocalVoiceStatus = {
  ready?: boolean;
  running?: boolean;
  dependencies?: {
    fasterWhisper?: boolean;
    kokoro?: boolean;
    soundfile?: boolean;
    numpy?: boolean;
  } | null;
  error?: string | null;
  voice?: string;
  sttModel?: string;
};

type TranscriptionResult = {
  ok?: boolean;
  text?: string;
  latencyMs?: number;
  language?: string;
};

type SynthesisResult = {
  ok?: boolean;
  mimeType?: string;
  audioBase64?: string;
  latencyMs?: number;
  voice?: string;
};

function preferredMimeType() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function base64ToBlob(base64: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

export function useLocalVoice() {
  const [status, setStatus] = useState<LocalVoiceStatus | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [energy, setEnergy] = useState(0);
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingPromiseRef = useRef<{
    resolve: (blob: Blob) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | MediaStreamAudioSourceNode | null>(null);
  const meterFrameRef = useRef<number>(0);
  const playSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const pumpingSpeechRef = useRef(false);
  const stopSpeechGenerationRef = useRef(0);

  const stopMeter = useCallback(() => {
    if (meterFrameRef.current) cancelAnimationFrame(meterFrameRef.current);
    meterFrameRef.current = 0;
    setEnergy(0);
  }, []);

  const closeAudioGraph = useCallback(() => {
    stopMeter();
    try { sourceNodeRef.current?.disconnect(); } catch {}
    sourceNodeRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") void context.close();
  }, [stopMeter]);

  const stopSpeaking = useCallback(() => {
    stopSpeechGenerationRef.current += 1;
    speechQueueRef.current = [];
    try { playSourceRef.current?.stop(); } catch {}
    playSourceRef.current = null;
    pumpingSpeechRef.current = false;
    setSpeaking(false);
    closeAudioGraph();
  }, [closeAudioGraph]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!window.braceDesktop) return null;
    try {
      const next = await window.braceDesktop.localVoiceStatus() as LocalVoiceStatus;
      setStatus(next);
      if (next.error) setError(next.error);
      return next;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Local voice runtime is unavailable.";
      setError(message);
      return null;
    }
  }, []);

  const warm = useCallback(async () => {
    if (!window.braceDesktop) return;
    try {
      await window.braceDesktop.warmLocalVoice();
      await refreshStatus();
      setError("");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Local voice could not warm up.";
      setError(message);
    }
  }, [refreshStatus]);

  useEffect(() => {
    void refreshStatus().then((next) => {
      const deps = next?.dependencies;
      if (deps?.fasterWhisper && deps?.kokoro && deps?.soundfile && deps?.numpy) {
        void warm();
      }
    });

    const dispose = window.braceDesktop?.onLocalVoiceStatus?.((raw) => {
      const next = raw as LocalVoiceStatus;
      setStatus(next);
      if (next.error) setError(next.error);
    });

    return () => {
      dispose?.();
      try { recorderRef.current?.stop(); } catch {}
      stopStream();
      stopSpeaking();
    };
  }, [refreshStatus, stopSpeaking, stopStream, warm]);

  const meterNode = useCallback((context: AudioContext, analyser: AnalyserNode) => {
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    const values = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(values);
      let sum = 0;
      for (const value of values) {
        const normalized = (value - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / values.length);
      setEnergy(Math.min(1, rms * 5.4));
      meterFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const startListening = useCallback(async () => {
    if (recording || transcribing) return;
    stopSpeaking();
    setError("");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
    streamRef.current = stream;

    const mimeType = preferredMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onerror = () => {
      recordingPromiseRef.current?.reject(new Error("Microphone recording failed."));
      recordingPromiseRef.current = null;
      setRecording(false);
      stopStream();
      closeAudioGraph();
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      recordingPromiseRef.current?.resolve(blob);
      recordingPromiseRef.current = null;
      chunksRef.current = [];
      stopStream();
      closeAudioGraph();
    };

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioContextCtor) {
      const context = new AudioContextCtor();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      const analyser = context.createAnalyser();
      source.connect(analyser);
      meterNode(context, analyser);
    }

    recorder.start(180);
    setRecording(true);
  }, [closeAudioGraph, meterNode, recording, stopSpeaking, stopStream, transcribing]);

  const stopListening = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return "";
    setRecording(false);

    const blob = await new Promise<Blob>((resolve, reject) => {
      recordingPromiseRef.current = { resolve, reject };
      recorder.stop();
    });
    recorderRef.current = null;

    if (blob.size < 800) return "";
    setTranscribing(true);
    try {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const result = await window.braceDesktop?.transcribeLocalVoice({
        bytes,
        mimeType: blob.type || "audio/webm",
        language: "en",
      }) as TranscriptionResult | undefined;
      if (!result?.ok) throw new Error("Local transcription failed.");
      setError("");
      return String(result.text || "").trim();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Local transcription failed.";
      setError(message);
      throw cause;
    } finally {
      setTranscribing(false);
    }
  }, []);

  const playSynthesized = useCallback(async (text: string, generation: number) => {
    const clean = String(text || "").trim();
    if (!clean || !window.braceDesktop || generation !== stopSpeechGenerationRef.current) return;
    setError("");

    const result = await window.braceDesktop.synthesizeLocalVoice({
      text: clean.slice(0, 1200),
      voice: "bm_george",
      speed: 1.02,
    }) as SynthesisResult;
    if (!result?.ok || !result.audioBase64 || generation !== stopSpeechGenerationRef.current) return;

    const blob = base64ToBlob(result.audioBase64, result.mimeType || "audio/wav");
    const data = await blob.arrayBuffer();
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) throw new Error("Web Audio is unavailable.");

    const context = new AudioContextCtor();
    audioContextRef.current = context;
    const buffer = await context.decodeAudioData(data.slice(0));
    if (generation !== stopSpeechGenerationRef.current) {
      await context.close();
      return;
    }

    const source = context.createBufferSource();
    const analyser = context.createAnalyser();
    source.buffer = buffer;
    source.connect(analyser);
    analyser.connect(context.destination);
    playSourceRef.current = source;
    sourceNodeRef.current = source;
    meterNode(context, analyser);
    setSpeaking(true);

    await new Promise<void>((resolve) => {
      source.onended = () => resolve();
      source.start(0);
    });

    playSourceRef.current = null;
    closeAudioGraph();
  }, [closeAudioGraph, meterNode]);

  const pumpSpeechQueue = useCallback(async () => {
    if (pumpingSpeechRef.current) return;
    pumpingSpeechRef.current = true;
    const generation = stopSpeechGenerationRef.current;
    setSpeaking(true);

    try {
      while (speechQueueRef.current.length && generation === stopSpeechGenerationRef.current) {
        const nextText = speechQueueRef.current.shift();
        if (!nextText) continue;
        await playSynthesized(nextText, generation);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Local speech playback failed.";
      setError(message);
    } finally {
      if (generation === stopSpeechGenerationRef.current) {
        pumpingSpeechRef.current = false;
        setSpeaking(false);
        setEnergy(0);
      }
    }
  }, [playSynthesized]);

  const enqueueSpeech = useCallback((text: string) => {
    const clean = String(text || "").trim();
    if (!clean) return;
    speechQueueRef.current.push(clean);
    void pumpSpeechQueue();
  }, [pumpSpeechQueue]);

  const speak = useCallback(async (text: string) => {
    stopSpeaking();
    enqueueSpeech(text);
  }, [enqueueSpeech, stopSpeaking]);

  return {
    status,
    recording,
    transcribing,
    speaking,
    energy,
    error,
    startListening,
    stopListening,
    stopSpeaking,
    speak,
    enqueueSpeech,
    warm,
    refreshStatus,
  };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
