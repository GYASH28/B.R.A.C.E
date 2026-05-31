import { useEffect, useState } from "react";
import { Gauge, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { DiagnosticsCheckCard, type DiagnosticsCheckStatus } from "../components/DiagnosticsCheckCard";
import type { SettingsState, VoiceStatus } from "../types";

type DiagnosticsPageProps = {
  settings: SettingsState;
  voiceStatus: VoiceStatus | null;
  onRefreshVoice: () => void;
  systemInfo: any;
};

export function DiagnosticsPage({ settings, voiceStatus, onRefreshVoice, systemInfo }: DiagnosticsPageProps) {
  const [micState, setMicState] = useState<DiagnosticsCheckStatus>("checking");
  const [gitState, setGitState] = useState<DiagnosticsCheckStatus>("checking");
  const [gitnexusCli, setGitnexusCli] = useState<DiagnosticsCheckStatus>("checking");
  const [backendState, setBackendState] = useState<DiagnosticsCheckStatus>("checking");
  const [busy, setBusy] = useState(false);

  const checkMicrophonePermission = async () => {
    try {
      if (!navigator.permissions?.query) {
        setMicState("warn");
        return;
      }
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (result.state === "granted") {
        setMicState("pass");
      } else if (result.state === "denied") {
        setMicState("fail");
      } else {
        setMicState("warn");
      }
    } catch {
      setMicState("warn");
    }
  };

  const checkLocalGit = async () => {
    if (!window.braceDesktop) {
      setGitState("fail");
      return;
    }
    try {
      const response = await window.braceDesktop.state();
      if (response && response.projects) {
        setGitState("pass");
      } else {
        setGitState("warn");
      }
    } catch {
      setGitState("fail");
    }
  };

  const checkGitnexus = async () => {
    if (!window.braceDesktop) {
      setGitnexusCli("fail");
      return;
    }
    try {
      const response = await window.braceDesktop.gitnexusStatus({});
      if (response.ok) {
        setGitnexusCli("pass");
      } else {
        setGitnexusCli("warn");
      }
    } catch {
      setGitnexusCli("fail");
    }
  };

  const runAllDiagnostics = async () => {
    setBusy(true);
    setBackendState("checking");
    setMicState("checking");
    setGitState("checking");
    setGitnexusCli("checking");

    // Probes
    onRefreshVoice();
    await checkMicrophonePermission();
    await checkLocalGit();
    await checkGitnexus();
    
    setBackendState(window.braceDesktop ? "pass" : "fail");
    setBusy(false);
  };

  useEffect(() => {
    void runAllDiagnostics();
  }, []);

  // Compute status aggregates
  const hasGemini = settings.geminiKey === "__saved__";
  const geminiStatus: DiagnosticsCheckStatus = hasGemini ? "pass" : "warn";
  const voiceboxConnected = voiceStatus?.voiceboxConnected;
  const voiceboxStatus: DiagnosticsCheckStatus = voiceboxConnected ? "pass" : "warn";

  const browserTts: DiagnosticsCheckStatus = typeof window !== "undefined" && "speechSynthesis" in window ? "pass" : "fail";
  const browserStt: DiagnosticsCheckStatus = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) ? "pass" : "fail";

  const allPassed = 
    backendState === "pass" && 
    micState === "pass" && 
    gitState === "pass" && 
    gitnexusCli === "pass" && 
    geminiStatus === "pass" && 
    voiceboxStatus === "pass";

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-left">
      {/* Header card */}
      <section className="glass-panel rounded-2xl border border-white/10 p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200 font-mono">App Security & Health</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">System Diagnostics</h1>
          <p className="mt-3 text-slate-400">
            Real-time checks of low-level dependencies, sandbox APIs, and connection metrics.
          </p>
        </div>
        <button 
          className="secondary-button" 
          disabled={busy} 
          onClick={runAllDiagnostics} 
          type="button"
        >
          <RefreshCw className={busy ? "animate-spin" : ""} size={16} />
          Run Suite
        </button>
      </section>

      {/* Overview Status Banner */}
      <div className={`rounded-2xl border p-5 flex items-start gap-4 ${
        allPassed ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200" : "border-amber-500/25 bg-amber-500/5 text-amber-200"
      }`}>
        {allPassed ? (
          <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={20} />
        ) : (
          <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={20} />
        )}
        <div>
          <h2 className="font-semibold text-white text-sm">
            {allPassed ? "All Core Integrations Verified" : "Dependency Action Required"}
          </h2>
          <p className="mt-1 text-xs text-slate-400 leading-5">
            {allPassed 
              ? "B.R.A.C.E. local engine, speech clients, and repository mappings are connected successfully." 
              : "Some local components require configuration or permissions to work end-to-end. Please inspect the checklists below."
            }
          </p>
        </div>
      </div>

      {/* Diagnostics Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <DiagnosticsCheckCard
          label="Electron Sandbox Bridge"
          status={backendState}
          description="Checks if window.braceDesktop context-isolation API is exposed safely in the app browser context."
          fixText="Close other applications and launch B.R.A.C.E via 'npm run brace:desktop'."
        />

        <DiagnosticsCheckCard
          label="Microphone Hardware Permission"
          status={micState}
          description="Verifies browser has permission to capture audio input device arrays for speech dictation."
          fixText="Go to Access panel, click Toggle on Microphone, or change Windows Privacy Settings for Apps."
        />

        <DiagnosticsCheckCard
          label="Local Git Workspace"
          status={gitState}
          description="Verifies git commands can read local repository workspace and history snapshot."
          fixText="Ensure 'git' is installed on PATH. Run 'git init' in the B.R.A.C.E directory."
        />

        <DiagnosticsCheckCard
          label="Gemini API Key"
          status={geminiStatus}
          description="Checks if Google AI Studio Gemini API key is configured locally for fallback operations."
          fixText="Go to Settings page, paste your Gemini API Key, and save key."
        />

        <DiagnosticsCheckCard
          label="Voicebox Server Reachability"
          status={voiceboxStatus}
          description="Tries to establish connection with local Voicebox API port (17493)."
          fixText="Launch Voicebox.exe or verify port 17493 is not blocked by Windows Firewall."
        />

        <DiagnosticsCheckCard
          label="GitNexus AST CLI"
          status={gitnexusCli}
          description="Verifies the GitNexus tree-sitter analysis parser command-line tool is available."
          fixText="Run 'npm install -g gitnexus' in terminal to register the AST scanner."
        />

        <DiagnosticsCheckCard
          label="Browser Text-to-Speech (TTS)"
          status={browserTts}
          description="Checks browser's native window.speechSynthesis fallback engine."
          fixText="Use Chrome or Edge to launch the desktop application."
        />

        <DiagnosticsCheckCard
          label="Browser Speech Recognition (STT)"
          status={browserStt}
          description="Checks browser's built-in webkitSpeechRecognition API fallback engine."
          fixText="Ensure your browser supports Web Speech APIs."
        />
      </div>

      {/* Environment telemetry metrics */}
      <section className="glass-panel rounded-2xl border border-white/10 p-5 space-y-3 font-mono text-xs">
        <h2 className="font-semibold text-white font-sans text-sm">Environment Telemetry</h2>
        <div className="grid gap-2 sm:grid-cols-2 text-slate-400">
          <p><strong>Node.js Version:</strong> {systemInfo?.tools?.node || "Unavailable"}</p>
          <p><strong>OS Architecture:</strong> {systemInfo?.os?.platform} {systemInfo?.os?.arch || "Windows (Unavailable)"}</p>
          <p><strong>Uptime:</strong> {systemInfo?.os?.uptimeSeconds ? `${Math.round(systemInfo.os.uptimeSeconds / 60)} minutes` : "Unavailable"}</p>
          <p><strong>Filesystem State:</strong> {systemInfo?.tools?.filesystemWritable ? "Writable" : "Read-Only"}</p>
        </div>
      </section>
    </div>
  );
}
export default DiagnosticsPage;
