import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command, Settings2 } from "lucide-react";
import { AgentField, type ActiveAgentNode } from "./agents/AgentField";
import { ApprovalOverlay } from "./approvals/ApprovalOverlay";
import { BraceComposer } from "./composer/BraceComposer";
import { BraceOrb, type BraceOrbState } from "./orb/BraceOrb";
import type {
  AgentTaskRecord,
  ApprovalRequest,
  ChatMessage,
  FileEntry,
  ProjectInfo,
} from "./types";

type BridgeState = {
  chatHistory?: ChatMessage[];
  agentTasks?: AgentTaskRecord[];
  approvals?: ApprovalRequest[];
  projects?: ProjectInfo[];
};

type AgentResult = {
  ok?: boolean;
  mode?: string;
  text?: string;
  error?: string;
  provider?: string;
  agent?: string;
  agentName?: string;
  task?: AgentTaskRecord;
  approval?: ApprovalRequest;
  sources?: Array<{ title?: string; url: string }>;
};

type AgentEvent = {
  taskId?: string;
  type?: string;
  message?: string;
  task?: AgentTaskRecord;
  agent?: string;
  agentName?: string;
  detail?: string;
  status?: ActiveAgentNode["status"];
};

const initialMessage: ChatMessage = {
  id: 1,
  role: "assistant",
  source: "system",
  text: "Ready when you are.",
};

const id = () => Date.now() + Math.floor(Math.random() * 10000);

function shortText(text: string, max = 220) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact;
}

function prettyAgentName(event: AgentEvent) {
  if (event.agentName) return event.agentName;
  if (event.agent) return event.agent.replace(/(^|[-_ ])\w/g, (value) => value.toUpperCase()).replace(/[-_]/g, " ");
  const intent = event.task?.intent;
  if (!intent) return "Specialist";
  const known: Record<string, string> = {
    file_action: "Files",
    folder_action: "Files",
    system_info: "System",
    app_launch: "System",
    coding: "Coder",
    git: "Git",
    memory: "Memory",
    browser_task: "Researcher",
    research: "Researcher",
    planning: "Planner",
  };
  return known[intent] || intent.replace(/(^|[_-])\w/g, (value) => value.replace(/[_-]/g, " ").toUpperCase());
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [attachment, setAttachment] = useState<FileEntry | null>(null);
  const [activeAgents, setActiveAgents] = useState<ActiveAgentNode[]>([]);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [orbState, setOrbState] = useState<BraceOrbState>("offline");
  const [busy, setBusy] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState("");
  const [notice, setNotice] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant"),
    [messages],
  );
  const recentConversation = useMemo(() => messages.filter((message) => message.role !== "system").slice(-4), [messages]);

  const setAgentNode = useCallback((node: ActiveAgentNode) => {
    setActiveAgents((current) => {
      const exists = current.some((item) => item.id === node.id);
      const next = exists
        ? current.map((item) => (item.id === node.id ? { ...item, ...node } : item))
        : [...current, node];
      return next.slice(-4);
    });
  }, []);

  const retireAgent = useCallback((agentId: string, status: "done" | "failed") => {
    setActiveAgents((current) =>
      current.map((node) => (node.id === agentId ? { ...node, status } : node)),
    );
    window.setTimeout(() => {
      setActiveAgents((current) => current.filter((node) => node.id !== agentId));
    }, 1100);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!window.braceDesktop) {
        setLoaded(true);
        setOrbState("offline");
        setNotice("Desktop bridge unavailable");
        return;
      }
      try {
        const state = (await window.braceDesktop.state()) as BridgeState;
        setMessages(state.chatHistory?.length ? state.chatHistory : [initialMessage]);
        setProjects(state.projects ?? []);
        const pending = (state.approvals ?? []).find((item) => item.status === "pending") ?? null;
        setApproval(pending);
        setOrbState(pending ? "awaiting_approval" : "idle");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Failed to initialize B.R.A.C.E");
        setOrbState("error");
      } finally {
        setLoaded(true);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!loaded || !window.braceDesktop) return;
    void window.braceDesktop.saveChat(messages);
  }, [loaded, messages]);

  useEffect(() => {
    const disposeAgent = window.braceDesktop?.onAgentEvent?.((raw) => {
      const event = raw as AgentEvent;
      const nodeId = event.agent ? `agent:${event.agent}` : event.taskId ? `task:${event.taskId}` : `event:${id()}`;
      if (event.type === "completed" || event.status === "done") {
        retireAgent(nodeId, "done");
        return;
      }
      if (event.type === "failed" || event.status === "failed") {
        retireAgent(nodeId, "failed");
        return;
      }
      if (event.taskId) setCurrentTaskId(event.taskId);
      const detail =
        event.detail ||
        event.message ||
        event.task?.goal ||
        (event.type === "plan" ? "Planning task" : "Working");
      setAgentNode({
        id: nodeId,
        name: prettyAgentName(event),
        detail: shortText(detail, 68),
        status: event.status || (event.type === "plan" ? "spawning" : "working"),
      });
      setOrbState(event.type === "plan" ? "planning" : "working");
    });

    const disposeApproval = window.braceDesktop?.onApprovalRequest?.((raw) => {
      const next = raw as ApprovalRequest;
      setApproval(next);
      setCurrentTaskId(next.taskId);
      setOrbState("awaiting_approval");
      setBusy(false);
    });

    return () => {
      disposeAgent?.();
      disposeApproval?.();
    };
  }, [retireAgent, setAgentNode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const addAssistant = (text: string) => {
    setMessages((current) => [...current, { id: id(), role: "assistant", source: "agent", text }]);
  };

  const send = async () => {
    const query = input.trim();
    if (!query || busy || !window.braceDesktop) return;

    setInput("");
    setNotice("");
    setBusy(true);
    setOrbState("thinking");
    setMessages((current) => [...current, { id: id(), role: "user", text: query }]);

    try {
      const result = (await window.braceDesktop.runAgent({
        command: query,
        selectedFile: attachment,
        workspacePath: projects[0]?.path,
      })) as AgentResult;

      if (result.task?.id) setCurrentTaskId(result.task.id);
      if (result.approval) {
        setApproval(result.approval);
        setOrbState("awaiting_approval");
        setBusy(false);
        return;
      }

      const sourceText = result.sources?.length
        ? `\n\n${result.sources.slice(0, 4).map((source) => source.url).join("\n")}`
        : "";
      const text = `${result.text || result.error || "Task finished without a text response."}${sourceText}`;
      addAssistant(text);

      if (result.ok === false) {
        setOrbState("error");
        setNotice(result.error || "Task failed");
        window.setTimeout(() => setOrbState("idle"), 1600);
      } else {
        setOrbState("success");
        window.setTimeout(() => setOrbState("idle"), 950);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "B.R.A.C.E could not complete that request.";
      addAssistant(message);
      setNotice(message);
      setOrbState("error");
      window.setTimeout(() => setOrbState("idle"), 1800);
    } finally {
      setBusy(false);
      setAttachment(null);
    }
  };

  const stop = async () => {
    if (currentTaskId) {
      await window.braceDesktop?.cancelAgent({ taskId: currentTaskId });
      retireAgent(`task:${currentTaskId}`, "failed");
    }
    setBusy(false);
    setOrbState("idle");
    setNotice("Task stopped");
  };

  const attach = async () => {
    if (!window.braceDesktop) return;
    try {
      const response = (await window.braceDesktop.selectFiles()) as { ok?: boolean; files?: FileEntry[] };
      const selected = response.files?.[0] ?? null;
      setAttachment(selected);
      if (selected) setNotice(`Attached ${selected.name}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not attach file");
    }
  };

  const voice = () => {
    setNotice("Local voice stack is being migrated to the Codex-native runtime.");
    setOrbState("listening");
    window.setTimeout(() => setOrbState("idle"), 850);
  };

  const approve = async () => {
    if (!approval || !window.braceDesktop) return;
    setBusy(true);
    setOrbState("working");
    try {
      const result = (await window.braceDesktop.approveAgent({ approvalId: approval.id })) as AgentResult;
      setApproval(null);
      addAssistant(result.text || "Approved task completed.");
      setOrbState(result.ok === false ? "error" : "success");
      window.setTimeout(() => setOrbState("idle"), 1000);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Approval failed");
      setOrbState("error");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!approval || !window.braceDesktop) return;
    await window.braceDesktop.rejectAgent({ approvalId: approval.id });
    setApproval(null);
    setOrbState("idle");
    addAssistant("Denied. I did not run that action.");
  };

  const statusLabel =
    approval ? "APPROVAL REQUIRED" :
    !window.braceDesktop ? "OFFLINE" :
    busy ? "WORKING" :
    loaded ? "READY" :
    "STARTING";

  return (
    <main className="brace-shell">
      <div className="brace-atmosphere" aria-hidden="true" />
      <header className="brace-topline">
        <div className="brace-brand">B.R.A.C.E</div>
        <div className="brace-status">
          <span className={`brace-status-dot brace-status-${statusLabel.toLowerCase().replace(/\s+/g, "-")}`} />
          {statusLabel}
        </div>
        <button className="brace-quiet-button" onClick={() => setCommandOpen(true)} type="button" aria-label="Commands">
          <Settings2 size={16} />
        </button>
      </header>

      <section className="brace-stage">
        <AgentField nodes={activeAgents} />

        <div className="brace-orb-zone">
          <BraceOrb state={orbState} onClick={voice} />
          <motion.div
            key={orbState}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="brace-state-label"
          >
            {orbState.replace(/_/g, " ")}
          </motion.div>
        </div>

        <div className="brace-conversation">
          <AnimatePresence mode="popLayout">
            {recentConversation.map((message) => (
              <motion.div
                key={message.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: message.id === recentConversation.at(-1)?.id ? 1 : 0.42, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`brace-message brace-message-${message.role}`}
              >
                <span>{message.role === "user" ? "You" : "B.R.A.C.E"}</span>
                <p>{shortText(message.text, message.id === latestAssistant?.id ? 520 : 260)}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {notice ? <div className="brace-notice">{notice}</div> : null}
      </section>

      <ApprovalOverlay approval={approval} onApprove={approve} onReject={reject} />

      <BraceComposer
        value={input}
        busy={busy}
        disabled={!loaded || !window.braceDesktop || Boolean(approval)}
        attachmentLabel={attachment?.name}
        onChange={setInput}
        onSend={send}
        onStop={stop}
        onAttach={attach}
        onVoice={voice}
      />

      <AnimatePresence>
        {commandOpen ? (
          <motion.div
            className="brace-command-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommandOpen(false)}
          >
            <motion.div
              className="brace-command"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.99 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="brace-command-title"><Command size={15} /> Quick controls</div>
              <button type="button" onClick={() => { setMessages([initialMessage]); setCommandOpen(false); }}>New conversation</button>
              <button type="button" onClick={() => { setNotice("Second Brain remains connected through the local BRACE memory layer."); setCommandOpen(false); }}>Second Brain status</button>
              <button type="button" onClick={() => { setNotice("Full settings migration is next; legacy dashboard settings stay out of the main shell."); setCommandOpen(false); }}>Settings</button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
