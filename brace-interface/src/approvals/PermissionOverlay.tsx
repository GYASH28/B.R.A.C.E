import { AnimatePresence, motion } from "framer-motion";

export type LocalPermission = {
  name: string;
  label: string;
  description: string;
  riskLevel: string;
};

export function PermissionOverlay({
  permission,
  onAllow,
  onDeny,
}: {
  permission: LocalPermission | null;
  onAllow: () => void;
  onDeny: () => void;
}) {
  return (
    <AnimatePresence>
      {permission ? (
        <motion.div
          className="approval-overlay"
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
        >
          <div className="approval-kicker">Local capability · {permission.riskLevel}</div>
          <div className="approval-title">Allow {permission.label}?</div>
          <div className="approval-reason">{permission.description}</div>
          <div className="approval-actions">
            <button className="approval-secondary" onClick={onDeny} type="button">Not now</button>
            <button className="approval-primary" onClick={onAllow} type="button">Allow</button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
