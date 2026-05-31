import { Mic, Paperclip, Send, SlidersHorizontal, Square } from "lucide-react";
import type { PageId, VoiceOrbState } from "../types";

type VoiceControlsProps = {
  input: string;
  mode: string;
  onAttach: () => void;
  onInput: (value: string) => void;
  onMode: (mode: string) => void;
  onNavigate: (page: PageId) => void;
  onSend: () => void;
  onStop: () => void;
  onVoice: () => void;
  orbState: VoiceOrbState;
};

export function VoiceControls({ input, mode, onAttach, onInput, onMode, onNavigate, onSend, onStop, onVoice, orbState }: VoiceControlsProps) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-black/30 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select className="field-control sm:w-36" onChange={(event) => onMode(event.target.value)} value={mode}>
          <option value="chat">Chat</option>
          <option value="agent">Agent</option>
          <option value="coding">Coding</option>
          <option value="voice">Voice</option>
        </select>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button className="icon-button" onClick={onAttach} title="Attach file" type="button">
            <Paperclip size={18} />
          </button>
          <input
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-slate-500"
            onChange={(event) => onInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSend();
            }}
            placeholder="Ask B.R.A.C.E anything..."
            value={input}
          />
          <button className="icon-button" onClick={orbState === "speaking" ? onStop : onVoice} title={orbState === "speaking" ? "Stop speaking" : "Start voice"} type="button">
            {orbState === "speaking" ? <Square size={18} /> : <Mic size={18} />}
          </button>
          <button className="send-button" onClick={onSend} title="Send" type="button">
            <Send size={17} />
          </button>
        </div>
        <button className="icon-button" onClick={() => onNavigate("voice")} title="Voice settings" type="button">
          <SlidersHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}
