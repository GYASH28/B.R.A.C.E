import { ArrowUp, Mic, Paperclip, Square } from "lucide-react";
import { KeyboardEvent, useRef } from "react";

type Props = {
  value: string;
  disabled?: boolean;
  busy?: boolean;
  attachmentLabel?: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onAttach: () => void;
  onVoice: () => void;
};

export function BraceComposer({
  value,
  disabled,
  busy,
  attachmentLabel,
  onChange,
  onSend,
  onStop,
  onAttach,
  onVoice,
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!busy && value.trim()) onSend();
    }
  };

  return (
    <div className="brace-composer-wrap">
      {attachmentLabel ? <div className="brace-attachment-pill">{attachmentLabel}</div> : null}
      <div className="brace-composer">
        <button className="brace-composer-icon" onClick={onAttach} type="button" aria-label="Attach file">
          <Paperclip size={18} />
        </button>
        <textarea
          ref={ref}
          aria-label="Ask B.R.A.C.E"
          autoFocus
          disabled={disabled}
          rows={1}
          value={value}
          placeholder={disabled ? "B.R.A.C.E is unavailable" : "Ask B.R.A.C.E anything…"}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={keyDown}
        />
        <button className="brace-composer-icon" onClick={onVoice} type="button" aria-label="Voice">
          <Mic size={19} />
        </button>
        <button
          className={`brace-send ${busy ? "brace-send-stop" : ""}`}
          onClick={busy ? onStop : onSend}
          disabled={!busy && (!value.trim() || disabled)}
          type="button"
          aria-label={busy ? "Stop task" : "Send"}
        >
          {busy ? <Square size={14} fill="currentColor" /> : <ArrowUp size={18} />}
        </button>
      </div>
      <div className="brace-composer-hint">Enter to send · Shift+Enter for a new line · Ctrl+K commands</div>
    </div>
  );
}
