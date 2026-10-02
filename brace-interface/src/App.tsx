import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command, Settings2 } from "lucide-react";
import { AgentField, type ActiveAgentNode } from "./agents/AgentField";
import { CodexApprovalOverlay, type CodexApproval } from "./approvals/CodexApprovalOverlay";
import { BraceComposer } from "./composer/BraceComposer";
import { BraceOrb, type BraceOrbState } from "./orb/BraceOrb";
import type { ChatMessage, FileEntry, ProjectInfo } from "./types";

type BridgeState = {
  chatHistory?: ChatMessage[];
  projects?: ProjectInfo[];
};

type CodexStatus = {
  status: "stopped" | "starting" | "ready" | "auth-required" | "error" | "restarting";
  ready: boolean;
  authRequired?: boolean;
  version?: string;
  account?: { type?: string; planType?: string | null } | null;
  modelCount?: number;
  activeTurnId?: string | null;
  error?: string | null;
};

type CodexResult = {
  ok?: boolean;
  text?: string;
  error?: string | null;
  status?: string;
  turnId?: string;
  threadId?: string;
  model?: string;
  effort?: string;
  decision?: {
    category?: string;
    profile?: string;
    complexity?: number;
  };
};

type CodexDelta = {
  turnId?: string;
  delta?: string;
};

type CodexEvent = {
  type?: string;
  itemType?: string;
  command?: string;
  tool?: string;
  profile?: string;
  category?: string;
  model?: string;
  effort?: string;
};

type AgentEvent = {
  type?: string;
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
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact;
}

function statusLabel(status: CodexStatus | null, busy: boolean, approval: CodexApproval | null) {
  if (approval) return "APPROVAL REQUIRED";
  if (status?.status === "auth-required") return "AUTH REQUIRED";
  if (status?.status === "restarting") return "RESTARTING";
  if (status?.status === "error") return "ERROR";
  if (status?.status === "starting") return "STARTING";
  if (busy) return "WORKING";
  if (status?.ready) return "READY";
  return "OFFLINE";
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [attachment, setAttachment] = useState<FileEntry | null>(null);
  const [activeAgents, setActiveAgents] = useState<ActiveAgentNode[]>([]);
  const [codex, setCodex] = useState<CodexStatus | null>(null);
  const [approval, setApproval] = useState<CodexApproval | null>(null);
  const [orbState, setOrbState] = useState<BraceOrbState>("offline");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const streamingMessageId = useRef<number | null>(null);

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant"),
    [messages],
  );
  const recentConversation = useMemo(
    () => messages.filter((message) => message.role !== "system").slice(-4),
    [messages],
  );

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

  const connectCodex = useCallback(async () => {
    if (!window.braceDesktop) return;
    setNotice("");
    try {
      const next = (await window.braceDesktop.codexStatus()) as CodexStatus;
      setCodex(next);
      if (next.ready) {
        setOrbState("idle");
      } else if (next.authRequired) {
        setOrbState("offline");
        setNotice("Codex needs ChatGPT sign-in. Run “codex login” once, then reconnect.");
      } else if (next.error) {
        setOrbState("error");
        setNotice(next.error);
      }
    } catch (error) {
      setCodex({ status: "error", ready: false, error: error instanceof Error ? error.message : "Codex failed to start." });
      setOrbState("error");
      setNotice(error instanceof Error ? error.message : "Codex failed to start.");
    }
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
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Failed to initialize B.R.A.C.E");
        setOrbState("error");
      } finally {
        setLoaded(true);
      }
      void connectCodex();
    };
    void load();
  }, [connectCodex]);

  useEffect(() => {
    if (!loaded || !window.braceDesktop) return;
    void window.braceDesktop.saveChat(messages);
  }, [loaded, messages]);

  useEffect(() => {
    const disposeStatus = window.braceDesktop?.onCodexStatus?.((raw) => {
      const next = raw as CodexStatus;
      setCodex(next);
      if (next.status === "restarting") {
        setOrbState("offline");
        setNotice("Codex lost connection. Restarting…");
      } else if (next.status === "error") {
        setOrbState("error");
        if (next.error) setNotice(next.error);
      } else if (next.status === "auth-required") {
        setOrbState("offline");
        setNotice("Codex needs ChatGPT sign-in. Run “codex login” once, then reconnect.");
      } else if (next.ready && !busy && !approval) {
        setOrbState("idle");
        if (notice === "Codex lost connection. Restarting…") setNotice("");
      }
    });

    const disposeDelta = window.braceDesktop?.onCodexDelta?.((raw) => {
      const event = raw as CodexDelta;
      const messageId = streamingMessageId.current;
      if (!messageId || !event.delta) return;
      setMessages((current) => current.map((message) =>
        message.id === messageId
          ? { ...message, text: `${message.text || ""}${event.delta}` }
          : message,
      ));
    });

    const disposeEvent = window.braceDesktop?.onCodexEvent?.((raw) => {
      const event = raw as CodexEvent;
      if (event.type === "turn.starting") {
        setOrbState("thinking");
        const route = [event.profile, event.model, event.effort].filter(Boolean).join(" · ");
        if (route) setNotice(route);
      } else if (event.type === "plan") {
        setOrbState("planning");
      } else if (event.itemType === "commandExecution" || event.itemType === "fileChange" || event.itemType === "mcpToolCall") {
        setOrbState("working");
        const action = event.command || event.tool;
        if (action) setNotice(shortText(action, 130));
      }
    });

    const disposeAgent = window.braceDesktop?.onAgentEvent?.((raw) => {
      const event = raw as AgentEvent;
      if (!event.agent || !event.type?.startsWith("agent.")) return;
      const nodeId = `agent:${event.agent}`;

      if (event.type === "agent.completed" || event.status === "done") {
        retireAgent(nodeId, "done");
        return;
      }
      if (event.type === "agent.failed" || event.status === "failed") {
        retireAgent(nodeId, "failed");
        return;
      }

      setAgentNode({
        id: nodeId,
        name: event.agentName || "Codex Agent",
        detail: shortText(event.detail || "Working", 68),
        status: event.status || (event.type === "agent.spawned" ? "spawning" : "working"),
      });
      setOrbState(event.type === "agent.spawned" ? "delegating" : "working");
    });

    const disposeApproval = window.braceDesktop?.onCodexApproval?.((raw) => {
      setApproval(raw as CodexApproval);
      setOrbState("awaiting_approval");
    });

    return () => {
      disposeStatus?.();
      disposeDelta?.();
      disposeEvent?.();
      disposeAgent?.();
      disposeApproval?.();
    };
  }, [approval, busy, notice, retireAgent, setAgentNode]);

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

  const send = async () => {
    const query = input.trim();
    if (!query || busy || !window.braceDesktop || !codex?.ready) return;

    const userMessage: ChatMessage = { id: id(), role: "user", text: query };
    const responseId = id();
    const pendingResponse: ChatMessage = { id: responseId, role: "assistant", source: "agent", text: "" };

    setInput("");
    setNotice("");
    setBusy(true);
    setOrbState("thinking");
    streamingMessageId.current = responseId;
    setMessages((current) => [...current, userMessage, pendingResponse]);

    try {
      const attachmentContext = attachment?.path
        ? `\n\nSelected file: ${attachment.path}\nUse it only if it is relevant to my request.`
        : "";
      const result = (await window.braceDesktop.codexRun({
        prompt: `${query}${attachmentContext}`,
        workspacePath: projects[0]?.path,
      })) as CodexResult;

      const finalText = String(result.text || result.error || "").trim();
      setMessages((current) => current.map((message) => {
        if (message.id !== responseId) return message;
        if (finalText) return { ...message, text: finalText };
        return { ...message, text: result.ok === false ? "Codex could not complete that turn." : "Done." };
      }));

      if (result.ok === false) {
        setOrbState("error");
        setNotice(result.error || "Codex turn failed.");
        window.setTimeout(() => setOrbState(codex?.ready ? "idle" : "offline"), 1700);
      } else {
        setOrbState("success");
        setNotice([result.decision?.profile, result.model, result.effort].filter(Boolean).join(" · "));
        window.setTimeout(() => {
          setOrbState("idle");
          setNotice("");
        }, 1000);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "B.R.A.C.E could not complete that request.";
      setMessages((current) => current.map((item) =>
        item.id === responseId ? { ...item, text: message } : item,
      ));
      setNotice(message);
      setOrbState("error");
      window.setTimeout(() => setOrbState(codex?.ready ? "idle" : "offline"), 1800);
    } finally {
      streamingMessageId.current = null;
      setBusy(false);
      setAttachment(null);
    }
  };

  const stop = async () => {
    await window.braceDesktop?.codexInterrupt();
    streamingMessageId.current = null;
    setBusy(false);
    setApproval(null);
    setOrbState(codex?.ready ? "idle" : "offline");
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
    setNotice("Local voice is not enabled in the Codex-native build yet.");
    setOrbState("listening");
    window.setTimeout(() => setOrbState(codex?.ready ? "idle" : "offline"), 850);
  };

  const approve = async () => {
    if (!approval || !window.braceDesktop) return;
    try {
      await window.braceDesktop.codexApproval({ id: approval.id, allow: true });
      setApproval(null);
      setOrbState("working");
      setNotice("Approved once");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Approval failed");
      setOrbState("error");
    }
  };

  const reject = async () => {
    if (!approval || !window.braceDesktop) return;
    try {
      await window.braceDesktop.codexApproval({ id: approval.id, allow: false });
      setApproval(null);
      setOrbState("working");
      setNotice("Denied");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not deny approval");
      setOrbState("error");
    }
  };

  const newConversation = async () => {
    await window.braceDesktop?.codexNewThread();
    setMessages([initialMessage]);
    setActiveAgents([]);
    setApproval(null);
    setNotice("");
    setOrbState(codex?.ready ? "idle" : "offline");
    setCommandOpen(false);
  };

  const label = statusLabel(codex, busy, approval);

  return (
    <main className="brace-shell">
      <div className="brace-atmosphere" aria-hidden="true" />

      <header className="brace-topline">
        <div className="brace-brand">B.R.A.C.E</div>
        <button
          className="brace-status brace-status-button"
          type="button"
          onClick={() => void connectCodex()}
          title={codex?.version || "Codex"}
        >
          <span className={`brace-status-dot brace-status-${label.toLowerCase().replace(/\s+/g, "-")}`} />
          {label}
        </button>
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
                <p>{message.text ? shortText(message.text, message.id === latestAssistant?.id ? 620 : 280) : "…"}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {notice ? <div className="brace-notice">{notice}</div> : null}
      </section>

      <CodexApprovalOverlay approval={approval} onApprove={approve} onReject={reject} />

      <BraceComposer
        value={input}
        busy={busy}
        disabled={!loaded || !window.braceDesktop || !codex?.ready || Boolean(approval)}
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
              <button type="button" onClick={() => void newConversation()}>New conversation</button>
              <button type="button" onClick={() => { void connectCodex(); setCommandOpen(false); }}>Reconnect Codex</button>
              <button type="button" onClick={() => { setNotice("Second Brain → Codex retrieval is the next runtime layer being wired."); setCommandOpen(false); }}>Second Brain status</button>
              <button type="button" onClick={() => { setNotice(`Codex ${codex?.version || "not detected"} · ${codex?.account?.planType || "account unknown"}`); setCommandOpen(false); }}>Runtime status</button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
