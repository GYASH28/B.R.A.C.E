import { useCallback } from "react";
import { Mic, Paperclip, Send, Square, VolumeX } from "lucide-react";
import { VoiceOrb } from "../voice/VoiceOrb";
import { VoiceStatusPill } from "../voice/VoiceStatusPill";
import { QuickActionGrid } from "../components/QuickActionGrid";
import { TranscriptPanel } from "../components/TranscriptPanel";
import { ApprovalPanel } from "../components/ApprovalPanel";
import type { ApprovalRequest, PageId } from "../types";

type HomePageProps = {
  desktopReady: boolean;
  input: string;
  onInput: (value: string) => void;
  onSend: () => void;
  onAttach: () => void;
  onNavigate: (page: PageId) => void;
  voiceAgent: any;
  approvals: ApprovalRequest[];
  onApprove: (approvalId: string) => Promise<void>;
  onReject: (approvalId: string) => Promise<void>;
};

export function HomePage({
  desktopReady,
  input,
  onInput,
  onSend,
  onAttach,
  onNavigate,
  voiceAgent,
  approvals,
  onApprove,
  onReject
}: HomePageProps) {
  const voiceReady = voiceAgent.status?.fallbackActive
    ? "Browser fallback active"
    : `${voiceAgent.status?.ttsProvider ?? "Voice"} active`;

  const onVoiceClick = useCallback(() => {
    if (voiceAgent.orbState === "speaking") {
      voiceAgent.stopAllAudio();
    } else {
      void voiceAgent.startListening();
    }
  }, [voiceAgent]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSend();
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl flex-col items-center justify-center gap-6 px-4 text-center">
      {/* Central Animated Orb */}
      <div className="relative mt-2">
        <div className="home-orb-halo" />
        <VoiceOrb
          isConnected={desktopReady}
          isVoiceEnabled={voiceAgent.config.volume > 0}
          onClick={onVoiceClick}
          state={voiceAgent.orbState}
          volumeLevel={voiceAgent.volumeLevel}
        />
      </div>

      {/* Voice Status Pill */}
      <div className="flex flex-col items-center gap-2">
        <button onClick={() => onNavigate("voice")} className="outline-none focus:ring-1 focus:ring-cyan-300/40 rounded-full">
          <VoiceStatusPill
            orbState={voiceAgent.orbState}
            voiceboxStatus={voiceAgent.status?.voiceboxConnected ? "connected" : "offline"}
            activeProvider={voiceAgent.status?.activeProvider ?? ""}
          />
        </button>
      </div>

      {/* Assistant Status Text */}
      <div className="max-w-xl">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-cyan-200">
          Brain / Responsive / Agentic / Companion / Engine
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
          B.R.A.C.E.
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400 font-mono">
          {voiceAgent.error || voiceReady}
        </p>
      </div>

      {/* Natural Language Command Bar */}
      <div className="w-full max-w-2xl mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-2 backdrop-blur-xl focus-within:border-cyan-300/40 transition duration-300">
        <button 
          className="icon-button shrink-0" 
          onClick={onAttach} 
          title="Attach file" 
          type="button"
        >
          <Paperclip size={18} />
        </button>
        
        <input
          className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-slate-600"
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask B.R.A.C.E... (Local notes search executes first)"
          value={input}
        />
        
        <button 
          className={`icon-button shrink-0 ${voiceAgent.listening ? "text-cyan-200" : ""}`}
          onClick={voiceAgent.listening ? voiceAgent.stopListening : () => void voiceAgent.startListening()} 
          title="Voice command" 
          type="button"
        >
          <Mic size={18} className={voiceAgent.listening ? "animate-pulse" : ""} />
        </button>
        
        {voiceAgent.orbState === "speaking" && (
          <button 
            className="icon-button shrink-0 text-rose-300"
            onClick={voiceAgent.stopAllAudio} 
            title="Stop speaking" 
            type="button"
          >
            <Square size={17} />
          </button>
        )}
        
        <button 
          className="send-button shrink-0" 
          onClick={onSend} 
          title="Send" 
          type="button"
        >
          <Send size={17} />
        </button>
      </div>

      {/* Safety Approvals Queue */}
      <ApprovalPanel 
        approvals={approvals} 
        onApprove={onApprove} 
        onReject={onReject} 
      />

      {/* Voice transcripts */}
      <TranscriptPanel
        orbState={voiceAgent.orbState}
        partialTranscript={voiceAgent.partialTranscript}
        transcript={voiceAgent.transcript}
        lastResponse={voiceAgent.lastResponse}
      />

      {/* Quick Action Grid */}
      <QuickActionGrid 
        onNavigate={onNavigate} 
        onOpenVSCode={() => {
          if (window.braceDesktop) {
            void window.braceDesktop.runTask({
              id: "open-vscode-shortcut",
              title: "Open VS Code",
              type: "open-vscode",
              enabled: true,
              trusted: true,
              detail: "Launch VS Code via action runner",
              payload: {}
            });
          }
        }}
      />
    </div>
  );
}
export default HomePage;
