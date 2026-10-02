import { AnimatePresence, motion } from "framer-motion";
import type { ApprovalRequest } from "../types";

export function ApprovalOverlay({
  approval,
  onApprove,
  onReject,
}: {
  approval: ApprovalRequest | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <AnimatePresence>
      {approval ? (
        <motion.div
          className="approval-overlay"
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
        >
          <div className="approval-kicker">Approval required · {approval.riskLevel}</div>
          <div className="approval-title">{approval.plan.goal || approval.reason}</div>
          <div className="approval-reason">{approval.reason}</div>
          <div className="approval-actions">
            <button className="approval-secondary" onClick={onReject} type="button">Deny</button>
            <button className="approval-primary" onClick={onApprove} type="button">Allow once</button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
