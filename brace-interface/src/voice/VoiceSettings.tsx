import { Mic, Play, RefreshCw, RotateCcw, Square, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import type { VoiceConfig, VoiceStatus } from "../types";
import { defaultVoiceConfig } from "./voiceStateStore";

type VoiceOption = { id: string; label: string; description: string };

type VoiceSettingsProps = {
  browserVoiceOptions: VoiceOption[];
  config: VoiceConfig;
  devices: MediaDeviceInfo[];
  error: string;
  onPreview: () => void;
  onRefresh: () => void;
  onReplay: () => void;
  onStart: () => void;
  onStop: () => void;
  onStopAudio: () => void;
  onUpdate: (patch: Partial<VoiceConfig>) => void;
  partialTranscript: string;
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;
  status: VoiceStatus | null;
  transcript: string;
};

export function VoiceSettings({
  browserVoiceOptions,
  config,
  devices,
  error,
  onPreview,
  onRefresh,
  onReplay,
  onStart,
  onStop,
  onStopAudio,
  onUpdate,
  partialTranscript,
  selectedDeviceId,
  setSelectedDeviceId,
  status,
  transcript,
}: VoiceSettingsProps) {
  const localVoices = status?.availableVoices ?? [];
  const voiceOptions = [...localVoices, ...browserVoiceOptions];

  return (
    <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <section className="glass-panel rounded-2xl border border-white/10 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Voice engine</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Voice settings</h1>
          <p className="mt-3 text-slate-400">Local providers are used when installed. Browser Fallback stays available and clearly marked.</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Panel title="Voice mode">
            <Select label="Mode" value={config.mode} onChange={(mode) => onUpdate({ mode: mode as VoiceConfig["mode"] })} options={[
              ["best-local", "Best Local Voice"],
              ["fast-local", "Fast Local"],
              ["online-high-quality", "Online High Quality"],
              ["browser-fallback", "Browser Fallback"],
            ]} />
            <Select label="Voice" value={config.selectedVoice} onChange={(selectedVoice) => onUpdate({ selectedVoice })} options={voiceOptions.map((voice) => [voice.id, voice.label])} />
            <Select label="Style preset" value={config.stylePreset} onChange={(stylePreset) => onUpdate({ stylePreset })} options={localVoices.map((voice) => [voice.id, voice.label])} />
            <Select label="Language" value={config.language} onChange={(language) => onUpdate({ language })} options={[["en-IN", "English India"], ["en-US", "English US"], ["en-GB", "English UK"], ["hi-IN", "Hindi India"]]} />
          </Panel>

          <Panel title="Sound shaping">
            <Range label="Speed" value={config.speed} min={0.6} max={1.6} step={0.05} onChange={(speed) => onUpdate({ speed })} />
            <Range label="Pitch" value={config.pitch} min={0.5} max={1.6} step={0.05} onChange={(pitch) => onUpdate({ pitch })} />
            <Range label="Volume" value={config.volume} min={0} max={1} step={0.05} onChange={(volume) => onUpdate({ volume })} />
            <div className="flex flex-wrap gap-2">
              <button className="primary-button" onClick={onPreview} type="button"><Volume2 size={16} /> Preview</button>
              <button className="secondary-button" onClick={onReplay} type="button"><Play size={16} /> Replay</button>
              <button className="secondary-button" onClick={onStopAudio} type="button"><Square size={16} /> Stop</button>
            </div>
          </Panel>

          <Panel title="Microphone and turn detection">
            <Select label="Microphone" value={selectedDeviceId} onChange={setSelectedDeviceId} options={[["", "Default microphone"], ...devices.map((device) => [device.deviceId, device.label || `Microphone ${device.deviceId.slice(0, 5)}`])]} />
            <Range label="VAD sensitivity" value={config.vadSensitivity} min={0.015} max={0.12} step={0.005} onChange={(vadSensitivity) => onUpdate({ vadSensitivity })} />
            <Range label="Silence timeout ms" value={config.silenceTimeoutMs} min={500} max={1800} step={50} onChange={(silenceTimeoutMs) => onUpdate({ silenceTimeoutMs })} />
            <Range label="Max recording sec" value={Math.round(config.maxRecordingMs / 1000)} min={10} max={60} step={5} onChange={(seconds) => onUpdate({ maxRecordingMs: seconds * 1000 })} />
            <div className="flex flex-wrap gap-2">
              <button className="primary-button" onClick={onStart} type="button"><Mic size={16} /> Test mic</button>
              <button className="secondary-button" onClick={onStop} type="button"><Square size={16} /> Stop mic</button>
            </div>
          </Panel>

          <Panel title="Safety controls">
            <Toggle checked={config.interruptionEnabled} label="Interruption / barge-in" onClick={() => onUpdate({ interruptionEnabled: !config.interruptionEnabled })} />
            <Toggle checked={config.continuousListening} label="Continuous listening" onClick={() => onUpdate({ continuousListening: !config.continuousListening })} />
            <Toggle checked={config.wakeWordEnabled} label="Wake word placeholder" onClick={() => onUpdate({ wakeWordEnabled: !config.wakeWordEnabled })} />
            <Toggle checked={config.onlineVoiceEnabled} label="Allow online voice mode" onClick={() => onUpdate({ onlineVoiceEnabled: !config.onlineVoiceEnabled })} />
            <Toggle checked={config.saveTranscripts} label="Save transcripts" onClick={() => onUpdate({ saveTranscripts: !config.saveTranscripts })} />
            <button className="secondary-button" onClick={() => onUpdate(defaultVoiceConfig)} type="button"><RotateCcw size={16} /> Reset voice</button>
          </Panel>
        </section>
      </div>

      <aside className="space-y-6">
        <Panel title="Provider status">
          <StatusLine label="STT" value={status?.sttProvider ?? "checking"} />
          <StatusLine label="TTS" value={status?.ttsProvider ?? "checking"} />
          <StatusLine label="VAD" value={status?.vadProvider ?? "checking"} />
          <StatusLine label="Fallback" value={status?.fallbackActive ? "Browser active" : "Local/online ready"} />
          <button className="secondary-button" onClick={onRefresh} type="button"><RefreshCw size={16} /> Refresh</button>
        </Panel>
        <Panel title="Setup guidance">
          {(status?.setup ?? []).slice(0, 5).map((line) => <code className="block rounded-xl bg-black/30 p-3 text-xs text-cyan-100" key={line}>{line}</code>)}
          {status?.setup?.length === 0 && <p className="text-sm text-emerald-200">All selected voice dependencies are available.</p>}
        </Panel>
        <Panel title="Live transcript">
          <p className="min-h-16 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">{partialTranscript || transcript || "Transcript will appear here."}</p>
          {error && <p className="rounded-xl border border-rose-300/25 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</p>}
        </Panel>
      </aside>
    </div>
  );
}

function Panel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="glass-panel space-y-4 rounded-2xl border border-white/10 p-5">
      <h2 className="font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Select({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[][]; value: string }) {
  return (
    <label className="block text-sm text-slate-400">
      {label}
      <select className="field-control mt-2" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
      </select>
    </label>
  );
}

function Range({ label, max, min, onChange, step, value }: { label: string; max: number; min: number; onChange: (value: number) => void; step: number; value: number }) {
  return (
    <label className="block text-sm text-slate-400">
      {label}: {value}
      <input className="mt-2 w-full accent-cyan-300" max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} step={step} type="range" value={value} />
    </label>
  );
}

function Toggle({ checked, label, onClick }: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <button className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-300" onClick={onClick} type="button">
      {label}
      <span className={["toggle-pill scale-75", checked ? "toggle-pill-on" : ""].join(" ")}><span /></span>
    </button>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}
