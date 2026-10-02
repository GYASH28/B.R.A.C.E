import { motion } from "framer-motion";
import { Cpu, Network, Orbit } from "lucide-react";
import { useEffect, useState } from "react";

type AgentProfile = {
  id: string;
  name: string;
  icon: string;
  tier: "luna" | "terra" | "sol";
  description: string;
};

const tierLabel = {
  luna: "LUNA",
  terra: "TERRA",
  sol: "SOL",
};

export function AgentConstellation({ liveConnected }: { liveConnected: boolean }) {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [skillCount, setSkillCount] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.braceDesktop?.listAgents?.(),
      window.braceDesktop?.listSkills?.(),
    ]).then(([agentValue, skillValue]) => {
      if (!active) return;
      if (Array.isArray(agentValue)) setAgents(agentValue as AgentProfile[]);
      if (Array.isArray(skillValue)) setSkillCount(skillValue.length);
    });
    return () => {
      active = false;
    };
  }, []);

  const visible = agents.slice(0, 17);

  return (
    <aside className="agent-constellation pointer-events-none hidden 2xl:block">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-cyan-100/50">Cognitive mesh</p>
          <div className="mt-1 flex items-center gap-2 text-sm text-cyan-50">
            <Network size={14} />
            {visible.length || 17} specialist nodes
          </div>
        </div>
        <span className={["h-2 w-2 rounded-full", liveConnected ? "bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,.8)]" : "bg-cyan-200/45"].join(" ")} />
      </div>

      <div className="relative h-[360px] rounded-[28px] border border-cyan-200/10 bg-slate-950/25 p-4 backdrop-blur-xl">
        <span className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/15 shadow-[0_0_40px_rgba(34,211,238,.08)]" />
        <span className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cyan-200/10" />
        <motion.div
          animate={{ rotate: 360 }}
          className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-violet-200/10"
          transition={{ duration: 42, ease: "linear", repeat: Infinity }}
        />

        <div className="absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-300/10 shadow-[0_0_42px_rgba(34,211,238,.13)]">
          <Orbit size={18} className="text-cyan-100" />
          <span className="mt-1 font-mono text-[8px] tracking-[.2em] text-cyan-100/65">LUNA/HIGH</span>
        </div>

        {visible.map((agent, index) => {
          const angle = (index / Math.max(1, visible.length)) * Math.PI * 2 - Math.PI / 2;
          const radius = 132 + (index % 3) * 8;
          const left = 50 + (Math.cos(angle) * radius) / 3.2;
          const top = 50 + (Math.sin(angle) * radius) / 3.2;
          return (
            <motion.div
              animate={{ opacity: [0.45, 0.9, 0.45], scale: [0.96, 1.04, 0.96] }}
              className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 font-mono text-[9px] text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,.06)]"
              key={agent.id}
              style={{ left: `${left}%`, top: `${top}%` }}
              title={`${agent.name} · ${tierLabel[agent.tier]}`}
              transition={{ delay: index * 0.07, duration: 2.6 + (index % 4) * 0.4, repeat: Infinity }}
            >
              {agent.icon}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">
        <div className="rounded-xl border border-white/5 bg-white/[0.025] px-2 py-2">
          <Cpu size={11} className="mb-1 text-cyan-200" />
          Luna primary
          <span className="mt-1 block text-[7px] text-slate-600">{skillCount ? `${skillCount} skills` : "skills scan"}</span>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.025] px-2 py-2">
          <Cpu size={11} className="mb-1 text-violet-200" />
          Terra specialist
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.025] px-2 py-2">
          <Cpu size={11} className="mb-1 text-amber-100" />
          Sol escalation
        </div>
      </div>
    </aside>
  );
}
