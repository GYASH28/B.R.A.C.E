import { AnimatePresence, motion } from "framer-motion";

export type ActiveAgentNode = {
  id: string;
  name: string;
  detail: string;
  status: "spawning" | "working" | "waiting" | "tool" | "done" | "failed";
};

function nodePosition(index: number) {
  const slots = [
    { side: "left", top: "28%" },
    { side: "right", top: "30%" },
    { side: "left", top: "58%" },
    { side: "right", top: "60%" },
  ] as const;
  return slots[index % slots.length];
}

export function AgentField({ nodes }: { nodes: ActiveAgentNode[] }) {
  return (
    <div className="agent-field" aria-live="polite">
      <AnimatePresence>
        {nodes.slice(0, 3).map((node, index) => {
          const position = nodePosition(index);
          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.88, x: position.side === "left" ? 22 : -22 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.92, x: position.side === "left" ? 16 : -16 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className={`agent-node agent-node-${position.side}`}
              style={{ top: position.top }}
            >
              <span className={`agent-node-dot agent-node-dot-${node.status}`} />
              <span className="agent-node-copy">
                <strong>{node.name}</strong>
                <small>{node.detail}</small>
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
