import { useCallback, useEffect, useRef, useState } from "react";

type WakePrediction = {
  ok?: boolean;
  detected?: boolean;
  score?: number;
  model?: string;
};

type WakeWordArgs = {
  enabled: boolean;
  available: boolean;
  paused?: boolean;
  threshold?: number;
  onWake: () => void;
};

const TARGET_RATE = 16000;
const FRAME_SAMPLES = 1280;
const MAX_QUEUED_FRAMES = 6;

function concatInt16(left: Int16Array, right: Int16Array): Int16Array<ArrayBuffer> {
  if (!left.length) return new Int16Array(right);
  const merged = new Int16Array(left.length + right.length);
  merged.set(left, 0);
  merged.set(right, left.length);
  return merged;
}

function resampleTo16k(input: Float32Array, inputRate: number) {
  if (!input.length) return new Int16Array(0);
  const ratio = inputRate / TARGET_RATE;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Int16Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const position = index * ratio;
    const lower = Math.floor(position);
    const upper = Math.min(input.length - 1, lower + 1);
    const weight = position - lower;
    const sample = input[lower] * (1 - weight) + input[upper] * weight;
    const clipped = Math.max(-1, Math.min(1, sample));
    output[index] = clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff;
  }

  return output;
}

function pcmToBase64(frame: Int16Array) {
  const bytes = new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

export function useWakeWord({
  enabled,
  available,
  paused = false,
  threshold = 0.55,
  onWake,
}: WakeWordArgs) {
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState("");

  const activeRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const remainderRef = useRef(new Int16Array(0));
  const queueRef = useRef<Int16Array[]>([]);
  const processingRef = useRef(false);
  const generationRef = useRef(0);
  const startingRef = useRef(false);
  const onWakeRef = useRef(onWake);

  useEffect(() => {
    onWakeRef.current = onWake;
  }, [onWake]);

  const stop = useCallback(() => {
    generationRef.current += 1;
    queueRef.current = [];
    remainderRef.current = new Int16Array(0);
    processingRef.current = false;
    startingRef.current = false;

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      try { processorRef.current.disconnect(); } catch {}
    }
    try { sourceRef.current?.disconnect(); } catch {}
    try { silentGainRef.current?.disconnect(); } catch {}
    streamRef.current?.getTracks().forEach((track) => track.stop());

    processorRef.current = null;
    sourceRef.current = null;
    silentGainRef.current = null;
    streamRef.current = null;

    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== "closed") void context.close();

    activeRef.current = false;
    setActive(false);
    setScore(0);
  }, []);

  const pump = useCallback(async () => {
    if (processingRef.current || !window.braceDesktop) return;
    processingRef.current = true;
    const generation = generationRef.current;

    try {
      while (queueRef.current.length && generation === generationRef.current) {
        const frame = queueRef.current.shift();
        if (!frame) continue;

        const result = await window.braceDesktop.predictWakeWord({
          audioBase64: pcmToBase64(frame),
          threshold,
          cooldownSeconds: 1.6,
        }) as WakePrediction;

        if (generation !== generationRef.current) break;
        const nextScore = Number(result?.score || 0);
        setScore(nextScore);

        if (result?.detected) {
          stop();
          window.setTimeout(() => onWakeRef.current(), 30);
          break;
        }
      }
    } catch (cause) {
      if (generation === generationRef.current) {
        const message = cause instanceof Error ? cause.message : "Wake-word detection failed.";
        setError(message);
        stop();
      }
    } finally {
      processingRef.current = false;
    }
  }, [stop, threshold]);

  const start = useCallback(async () => {
    if (!enabled || !available || paused || activeRef.current || startingRef.current || !window.braceDesktop) return;

    const generation = ++generationRef.current;
    startingRef.current = true;
    setError("");

    try {
      await window.braceDesktop.warmWakeWord();
      if (generation !== generationRef.current) return;
      setReady(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) throw new Error("Web Audio is unavailable.");

      const context = new AudioContextCtor();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const silentGain = context.createGain();
      silentGain.gain.value = 0;

      streamRef.current = stream;
      contextRef.current = context;
      sourceRef.current = source;
      processorRef.current = processor;
      silentGainRef.current = silentGain;

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(context.destination);

      processor.onaudioprocess = (event) => {
        if (generation !== generationRef.current) return;
        const channel = event.inputBuffer.getChannelData(0);
        const fresh = resampleTo16k(channel, context.sampleRate);
        let pcm = concatInt16(remainderRef.current, fresh);

        while (pcm.length >= FRAME_SAMPLES) {
          const frame = pcm.slice(0, FRAME_SAMPLES);
          pcm = pcm.slice(FRAME_SAMPLES);
          queueRef.current.push(frame);
          if (queueRef.current.length > MAX_QUEUED_FRAMES) queueRef.current.shift();
        }

        remainderRef.current = pcm;
        void pump();
      };

      activeRef.current = true;
      setActive(true);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Wake-word microphone failed.";
      setError(message);
      stop();
    } finally {
      startingRef.current = false;
    }
  }, [available, enabled, paused, pump, stop]);

  useEffect(() => {
    if (enabled && available && !paused) void start();
    else stop();

    return () => stop();
  }, [available, enabled, paused, start, stop]);

  return {
    active,
    ready,
    score,
    error,
    start,
    stop,
  };
}
