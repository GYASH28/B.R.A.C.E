import { AnimatePresence, motion } from "framer-motion";

export type CodexApproval = {
  id: string;
  kind: "command" | "fileChange";
  command?: string | null;
  cwd?: string | null;
  reason?: string | null;
  riskLevel?: string;
};

export function CodexApprovalOverlay({
  approval,
  onApprove,
  onReject,
}: {
  approval: CodexApproval | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const title = approval?.kind === "command"
    ? approval.command || "Run a command"
    : "Apply file changes";

  return (
    <AnimatePresence>
      {approval ? (
        <motion.div
          className="approval-overlay"
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
        >
          <div className="approval-kicker">Codex approval required</div>
          <div className="approval-title">{title}</div>
          {approval.cwd ? <div className="approval-path">{approval.cwd}</div> : null}
          <div className="approval-reason">
            {approval.reason || (approval.kind === "command"
              ? "Codex wants permission before executing this command."
              : "Codex wants permission before writing these changes.")}
          </div>
          <div className="approval-actions">
            <button className="approval-secondary" onClick={onReject} type="button">Deny</button>
            <button className="approval-primary" onClick={onApprove} type="button">Allow once</button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
