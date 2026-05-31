import { useEffect, useState } from "react";
import { Cpu, RefreshCw, FileText, Terminal, Check, Play, BookOpen, AlertTriangle } from "lucide-react";
import type { PageId } from "../types";

type GitNexusDoc = {
  id: string;
  name: string;
  relPath: string;
  exists: boolean;
  fullPath: string | null;
  size: number;
  content: string;
};

type GitNexusStatusInfo = {
  ok: boolean;
  indexed: boolean;
  output: string;
  error: string | null;
  lastIndexTime: string | null;
};

export function SystemIntelligencePage() {
  const [status, setStatus] = useState<GitNexusStatusInfo | null>(null);
  const [docs, setDocs] = useState<GitNexusDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<GitNexusDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [outputLog, setOutputLog] = useState<{ command: string; stdout: string; stderr: string; exitCode: number | null; startedAt: string | null; endedAt: string | null } | null>(null);
  const [confirmCommand, setConfirmCommand] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<"analyze" | "reindex" | null>(null);

  const loadStatusAndDocs = async () => {
    if (!window.braceDesktop) return;
    setBusy(true);
    try {
      const [nextStatus, nextDocs] = await Promise.all([
        window.braceDesktop.gitnexusStatus({}),
        window.braceDesktop.gitnexusDocs({})
      ]);
      setStatus(nextStatus);
      setDocs(nextDocs);
      if (nextDocs.length > 0) {
        const found = nextDocs.find((d: any) => d.exists);
        if (found) setSelectedDoc(found);
      }
    } catch (err) {
      console.error("Failed to load GitNexus state", err);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void loadStatusAndDocs();
  }, []);

  const handleRequestIndex = (mode: "analyze" | "reindex") => {
    const cmd = mode === "reindex" ? "npx -y gitnexus@latest analyze --force" : "npx -y gitnexus@latest analyze";
    setConfirmCommand(cmd);
    setConfirmMode(mode);
  };

  const handleApproveIndex = async () => {
    if (!confirmMode || !window.braceDesktop) return;
    const mode = confirmMode;
    setConfirmCommand(null);
    setConfirmMode(null);
    setBusy(true);
    try {
      const result = await window.braceDesktop.gitnexusIndex({ mode });
      setOutputLog(result);
      await loadStatusAndDocs();
    } catch (err: any) {
      setOutputLog({
        command: confirmCommand || "",
        stdout: "",
        stderr: err.message || "Failed to execute index.",
        exitCode: 1,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString()
      });
    } finally {
      setBusy(false);
    }
  };

  const handleOpenDocExternally = async (filePath: string) => {
    if (!window.braceDesktop) return;
    try {
      await window.braceDesktop.gitnexusOpenDoc({ filePath });
    } catch (err) {
      window.alert("Failed to open document file: " + err);
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1fr_420px] text-left">
      <div className="space-y-6">
        {/* Main Header Panel */}
        <section className="glass-panel rounded-2xl border border-white/10 p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200 font-mono">AST Code Intelligence</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">System Intelligence</h1>
            <p className="mt-3 text-slate-400">
              GitNexus parses the tree-sitter AST syntax and exposes deep codebase logic coordinates.
            </p>
          </div>
          <button 
            className="secondary-button" 
            disabled={busy} 
            onClick={loadStatusAndDocs} 
            type="button"
          >
            <RefreshCw className={busy ? "animate-spin" : ""} size={16} />
            Refresh
          </button>
        </section>

        {/* Action Confirmation Modal/Overlay (Inline UI) */}
        {confirmCommand && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 shadow-lg">
            <div className="flex gap-3 items-start">
              <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-white text-sm">Verify Shell Command Execution</h3>
                <p className="mt-1 text-xs text-slate-400 leading-5">
                  B.R.A.C.E is in Safe Mode. Execution of shell commands requires your explicit permission.
                </p>
                <div className="mt-3 rounded-xl bg-black/50 border border-white/10 p-3 font-mono text-xs select-all text-amber-200">
                  {confirmCommand}
                </div>
                <div className="mt-4 flex gap-2">
                  <button 
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-black transition hover:bg-amber-400"
                    onClick={handleApproveIndex} 
                    type="button"
                  >
                    <Check size={14} />
                    Execute Command
                  </button>
                  <button 
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                    onClick={() => { setConfirmCommand(null); setConfirmMode(null); }} 
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Output Log Viewer */}
        {outputLog && (
          <section className="glass-panel rounded-2xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-cyan-200" />
                <h3 className="font-semibold text-white text-sm font-mono">Execution Log</h3>
              </div>
              <button 
                className="text-xs text-slate-500 hover:text-slate-300 font-mono"
                onClick={() => setOutputLog(null)}
              >
                Clear log
              </button>
            </div>
            
            <div className="text-xs space-y-1.5 text-slate-400 font-mono">
              <p><strong>Command:</strong> {outputLog.command}</p>
              <p><strong>Exit Code:</strong> <span className={outputLog.exitCode === 0 ? "text-emerald-400" : "text-rose-400"}>{outputLog.exitCode}</span></p>
              <p><strong>Execution Period:</strong> {outputLog.startedAt} to {outputLog.endedAt}</p>
            </div>

            {outputLog.stdout && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Stdout Output:</span>
                <pre className="max-h-48 overflow-auto rounded-xl bg-black/40 border border-white/5 p-3 text-xs leading-5 font-mono text-emerald-200/90 whitespace-pre-wrap">{outputLog.stdout}</pre>
              </div>
            )}

            {outputLog.stderr && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Stderr Output:</span>
                <pre className="max-h-48 overflow-auto rounded-xl bg-black/40 border border-white/5 p-3 text-xs leading-5 font-mono text-rose-200/90 whitespace-pre-wrap">{outputLog.stderr}</pre>
              </div>
            )}
          </section>
        )}

        {/* Documentation Content Viewer */}
        {selectedDoc && (
          <section className="glass-panel rounded-2xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-cyan-200" />
                <h3 className="font-semibold text-white text-sm">{selectedDoc.name}</h3>
              </div>
              {selectedDoc.exists && selectedDoc.fullPath && (
                <button 
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-300/30 hover:text-cyan-100 transition"
                  onClick={() => handleOpenDocExternally(selectedDoc.fullPath!)}
                  type="button"
                >
                  Edit File
                </button>
              )}
            </div>
            {selectedDoc.exists ? (
              <pre className="max-h-[500px] overflow-auto rounded-xl bg-black/20 border border-white/5 p-4 text-xs leading-6 text-slate-200 whitespace-pre-wrap select-text font-mono">
                {selectedDoc.content}
              </pre>
            ) : (
              <div className="py-12 text-center text-slate-500 text-sm">
                This rule/map file has not been generated by GitNexus yet. Click "Analyze Workspace" to index the project.
              </div>
            )}
          </section>
        )}
      </div>

      {/* Sidebar Control Column */}
      <aside className="space-y-6">
        {/* Status Check Card */}
        <div className="glass-panel space-y-4 rounded-2xl border border-white/10 p-5">
          <h2 className="font-semibold text-white text-sm">GitNexus Status</h2>
          
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs">
            <span className="text-slate-500 font-mono">Index Available</span>
            <span className={status?.indexed ? "text-emerald-400 font-bold" : "text-slate-500 font-bold"}>
              {status?.indexed ? "YES ✓" : "NO"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs">
            <span className="text-slate-500 font-mono">CLI Checker</span>
            <span className={status?.ok ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
              {status?.ok ? "Linked" : "Setup Needed"}
            </span>
          </div>

          {status?.lastIndexTime && (
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              Last indexed: {new Date(status.lastIndexTime).toLocaleString()}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button 
              className="primary-button justify-center" 
              disabled={busy} 
              onClick={() => handleRequestIndex("analyze")}
              type="button"
            >
              <Play size={14} />
              Analyze Workspace
            </button>
            <button 
              className="secondary-button justify-center" 
              disabled={busy} 
              onClick={() => handleRequestIndex("reindex")}
              type="button"
            >
              Force Re-Index
            </button>
          </div>
        </div>

        {/* Documentation Selector Card */}
        <div className="glass-panel space-y-3 rounded-2xl border border-white/10 p-5">
          <h2 className="font-semibold text-white text-sm">Cognitive Maps & Rules</h2>
          <div className="space-y-2">
            {docs.map((doc) => (
              <button
                className={[
                  "w-full flex items-center justify-between rounded-xl border p-3 text-left transition text-xs",
                  selectedDoc?.id === doc.id 
                    ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100" 
                    : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                ].join(" ")}
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                type="button"
              >
                <div>
                  <p className="font-medium text-white">{doc.name}</p>
                  <p className="mt-1 text-[10px] text-slate-500 font-mono">{doc.relPath}</p>
                </div>
                <span className={doc.exists ? "text-emerald-400" : "text-slate-600 font-mono text-[9px]"}>
                  {doc.exists ? <FileText size={14} /> : "missing"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* MCP Server Help Card */}
        <div className="glass-panel space-y-3 rounded-2xl border border-white/10 p-5 text-xs text-slate-400 leading-relaxed">
          <h2 className="font-semibold text-white text-sm">Cursor / Claude MCP Config</h2>
          <p>
            GitNexus functions as an MCP server. Add the following command in Cursor IDE or Claude CLI settings:
          </p>
          <pre className="rounded-xl bg-black/40 border border-white/5 p-3 font-mono select-all text-cyan-200 mt-2">
            npx gitnexus mcp
          </pre>
        </div>
      </aside>
    </div>
  );
}
export default SystemIntelligencePage;
