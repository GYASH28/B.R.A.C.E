import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";

export type DiagnosticsCheckStatus = "pass" | "warn" | "fail" | "checking";

type DiagnosticsCheckCardProps = {
  label: string;
  status: DiagnosticsCheckStatus;
  description: string;
  fixText?: string;
};

export function DiagnosticsCheckCard({ label, status, description, fixText }: DiagnosticsCheckCardProps) {
  const isPass = status === "pass";
  const isWarn = status === "warn";
  const isFail = status === "fail";
  const isChecking = status === "checking";

  const borderColor = isPass
    ? "border-emerald-500/20 bg-emerald-500/[0.02]"
    : isWarn
      ? "border-amber-500/20 bg-amber-500/[0.02]"
      : isFail
        ? "border-rose-500/20 bg-rose-500/[0.02]"
        : "border-white/5 bg-white/[0.01]";

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-300 ${borderColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-white text-sm">{label}</h3>
          <p className="mt-1 text-xs text-slate-400 leading-5">{description}</p>
        </div>

        <div className="shrink-0">
          {isPass && <CheckCircle2 className="text-emerald-400" size={18} />}
          {isWarn && <AlertTriangle className="text-amber-400" size={18} />}
          {isFail && <XCircle className="text-rose-400" size={18} />}
          {isChecking && <Loader2 className="text-cyan-400 animate-spin" size={18} />}
        </div>
      </div>

      {(isFail || isWarn) && fixText && (
        <div className="mt-3 rounded-xl bg-black/40 border border-white/5 p-3 text-xs leading-5">
          <span className="font-semibold text-cyan-200">How to resolve:</span>
          <p className="mt-1 text-slate-300 font-mono select-text">{fixText}</p>
        </div>
      )}
    </div>
  );
}
export default DiagnosticsCheckCard;
