import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, VoiceOrbState } from "../types";

type LiveSessionResponse = {
  session?: { id?: string };
  transport?: { type?: string; sdp?: string };
};

type DelegationResult = {
  text?: string;
  error?: string;
  agentName?: string;
  model?: string;
  effort?: string;
};

type UseGPTLiveArgs = {
  history?: ChatMessage[];
  workspacePath?: string;
};

export function useGPTLive({ history = [], workspacePath = "" }: UseGPTLiveArgs = {}) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [inputTranscript, setInputTranscript] = useState("");
  const [outputTranscript, setOutputTranscript] = useState("");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [volumeLevel, setVolumeLevel] = useState(0);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const inputRef = useRef("");
  const outputRef = useRef("");
  const speakingTimerRef = useRef<number | null>(null);
  const closedByUserRef = useRef(false);

  const send = useCallback((event: Record<string, unknown>) => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== "open") return false;
    channel.send(JSON.stringify(event));
    return true;
  }, []);

  const stopMeter = useCallback(() => {
    if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setVolumeLevel(0);
  }, []);

  const startMeter = useCallback((stream: MediaStream) => {
    stopMeter();
    const AudioContextCtor = window.AudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    audioContextRef.current = context;

    const sample = () => {
      analyser.getByteFrequencyData(data);
      let total = 0;
      for (const value of data) total += value;
      setVolumeLevel(Math.min(1, total / Math.max(1, data.length) / 96));
      animationRef.current = requestAnimationFrame(sample);
    };
    sample();
  }, [stopMeter]);

  const cleanup = useCallback(() => {
    stopMeter();
    if (speakingTimerRef.current != null) window.clearTimeout(speakingTimerRef.current);
    speakingTimerRef.current = null;
    channelRef.current?.close();
    peerRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }
    channelRef.current = null;
    peerRef.current = null;
    streamRef.current = null;
    audioRef.current = null;
    setConnected(false);
    setConnecting(false);
    setSessionId("");
    setOrbState("idle");
  }, [stopMeter]);

  const handleDelegation = useCallback(async (event: any) => {
    const delegationId = event?.delegation?.id;
    if (!delegationId || event?.delegation?.target !== "client") return;

    const task = inputRef.current.trim().slice(-2800);
    if (!task) {
      send({
        type: "session.commentary.append",
        event_id: `brace-empty-${Date.now()}`,
        delegation_id: delegationId,
        content: "I need a little more detail before I can run that task.",
      });
      return;
    }

    send({
      type: "session.thinking.append",
      event_id: `brace-progress-${Date.now()}`,
      delegation_id: delegationId,
      content: "BRACE delegated the task to its model router and specialist agents.",
    });

    try {
      const result = await window.braceDesktop?.runLiveDelegation?.({
        task,
        recentConversation: `USER:\n${inputRef.current.slice(-5000)}\n\nASSISTANT:\n${outputRef.current.slice(-5000)}`,
        workspacePath,
        delegationId,
      }) as DelegationResult | undefined;

      if (!result?.text) throw new Error(result?.error || "The delegated agent returned no result.");
      send({
        type: "session.commentary.append",
        event_id: `brace-result-${Date.now()}`,
        delegation_id: delegationId,
        content: String(result.text).slice(0, 2200),
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Delegated task failed.";
      send({
        type: "session.commentary.append",
        event_id: `brace-failed-${Date.now()}`,
        delegation_id: delegationId,
        content: `The delegated task failed: ${message}`,
      });
    }
  }, [send, workspacePath]);

  const handleEvent = useCallback((message: MessageEvent) => {
    try {
      const event = JSON.parse(String(message.data || "{}"));
      if (event.type === "session.started") {
        setConnected(true);
        setConnecting(false);
        setSessionId(event?.session?.id || "");
        setOrbState("listening");
        return;
      }
      if (event.type === "session.input_transcript.delta" && event.delta) {
        inputRef.current += event.delta;
        setInputTranscript(inputRef.current);
        setOrbState("listening");
        return;
      }
      if (event.type === "session.output_transcript.delta" && event.delta) {
        outputRef.current += event.delta;
        setOutputTranscript(outputRef.current);
        setOrbState("speaking");
        if (speakingTimerRef.current != null) window.clearTimeout(speakingTimerRef.current);
        speakingTimerRef.current = window.setTimeout(() => setOrbState("listening"), 850);
        return;
      }
      if (event.type === "session.delegation.created") {
        setOrbState("thinking");
        void handleDelegation(event);
        return;
      }
      if (event.type === "error") {
        const messageText = event?.error?.message || "GPT-Live session error.";
        setError(messageText);
        setOrbState("error");
        return;
      }
      if (event.type === "session.closed") cleanup();
    } catch {
      // Ignore non-JSON WebRTC control messages.
    }
  }, [cleanup, handleDelegation]);

  const connect = useCallback(async () => {
    if (connected || connecting) return;
    if (!window.braceDesktop?.createLiveSession) throw new Error("GPT-Live requires the BRACE desktop bridge.");

    closedByUserRef.current = false;
    setError("");
    setConnecting(true);
    setOrbState("thinking");
    inputRef.current = "";
    outputRef.current = "";
    setInputTranscript("");
    setOutputTranscript("");

    try {
      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = microphone;
      startMeter(microphone);

      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      for (const track of microphone.getTracks()) peer.addTrack(track, microphone);

      const speaker = new Audio();
      speaker.autoplay = true;
      audioRef.current = speaker;
      peer.ontrack = (event) => {
        speaker.srcObject = event.streams[0] || new MediaStream([event.track]);
        void speaker.play().catch(() => undefined);
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") setConnected(true);
        if (["failed", "closed", "disconnected"].includes(peer.connectionState) && !closedByUserRef.current) {
          setError(`GPT-Live connection ${peer.connectionState}.`);
          setOrbState("error");
        }
      };

      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.onmessage = handleEvent;
      channel.onopen = () => setOrbState("listening");
      channel.onerror = () => {
        setError("GPT-Live data channel error.");
        setOrbState("error");
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const response = await window.braceDesktop.createLiveSession({
        sdp: offer.sdp || "",
        history: history.slice(-24),
      }) as LiveSessionResponse;
      if (!response?.transport?.sdp) throw new Error("GPT-Live did not return a WebRTC answer.");
      if (response.session?.id) setSessionId(response.session.id);
      await peer.setRemoteDescription({ type: "answer", sdp: response.transport.sdp });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not start GPT-Live.";
      setError(message);
      setOrbState("error");
      cleanup();
      throw cause;
    }
  }, [cleanup, connected, connecting, handleEvent, history, startMeter]);

  const disconnect = useCallback(() => {
    closedByUserRef.current = true;
    send({ type: "session.close", event_id: `brace-close-${Date.now()}` });
    window.setTimeout(cleanup, 180);
  }, [cleanup, send]);

  const setMuted = useCallback((muted: boolean) => {
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    send({ type: muted ? "session.input_audio.mute" : "session.input_audio.unmute", event_id: `brace-mute-${Date.now()}` });
    setOrbState(muted ? "muted" : "listening");
  }, [send]);

  useEffect(() => cleanup, [cleanup]);

  return {
    connect,
    connected,
    connecting,
    disconnect,
    error,
    inputTranscript,
    orbState,
    outputTranscript,
    sessionId,
    setMuted,
    volumeLevel,
  };
}
