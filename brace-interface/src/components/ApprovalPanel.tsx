import { Shield, Check, X } from "lucide-react";
import type { ApprovalRequest } from "../types";

type ApprovalPanelProps = {
  approvals: ApprovalRequest[];
  onApprove: (approvalId: string) => Promise<void>;
  onReject: (approvalId: string) => Promise<void>;
};

export function ApprovalPanel({ approvals, onApprove, onReject }: ApprovalPanelProps) {
  if (approvals.length === 0) return null;

  return (
    <div className="max-w-3xl w-full mx-auto mt-6 space-y-4 text-left">
      <div className="flex items-center gap-2 px-1 text-amber-200">
        <Shield size={16} />
        <span className="font-mono text-xs uppercase tracking-wider">Safety Approval Queue ({approvals.length})</span>
      </div>
      {approvals.map((approval) => (
        <div 
          className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 shadow-lg backdrop-blur-md" 
          key={approval.id}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-amber-200">
                {approval.riskLevel} Risk Action
              </span>
              <h3 className="mt-2 font-display text-base font-semibold text-white">
                {approval.plan.goal}
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-400">
                Reason: {approval.reason}
              </p>
            </div>
            
            <div className="flex gap-2">
              <button 
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-black transition hover:bg-amber-400"
                onClick={() => void onApprove(approval.id)} 
                type="button"
              >
                <Check size={14} />
                Approve
              </button>
              <button 
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:border-rose-300/30 hover:bg-rose-950/20 hover:text-rose-200"
                onClick={() => void onReject(approval.id)} 
                type="button"
              >
                <X size={14} />
                Reject
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Plan Steps:</div>
            {approval.plan.steps.map((step) => (
              <div 
                className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-black/35 px-3 py-2 text-xs text-slate-300" 
                key={step.id}
              >
                <span className="font-medium text-white">{step.title}</span>
                <span className="font-mono text-[10px] text-slate-500">{step.tool}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
export default ApprovalPanel;
