const { execFile, spawn } = require("node:child_process");
const path = require("node:path");
const readline = require("node:readline");
const { routeLocalDecision } = require("./localDecisionRouter.cjs");

const DEFAULT_REQUEST_TIMEOUT = 20_000;
const DEFAULT_TURN_TIMEOUT = 5 * 60_000;

function safeString(value, limit = 280) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function supportedEfforts(model) {
  return (model?.supportedReasoningEfforts || [])
    .map((entry) => typeof entry === "string" ? entry : entry?.reasoningEffort)
    .filter(Boolean);
}

function effortForProfile(model, profile) {
  const supported = supportedEfforts(model);
  if (!supported.length) return model?.defaultReasoningEffort || undefined;
  const preference = profile === "DEEP"
    ? ["xhigh", "high", "medium", "low", "minimal"]
    : profile === "NORMAL"
      ? ["high", "medium", "low", "minimal", "xhigh"]
      : ["low", "minimal", "medium", "high", "xhigh"];
  return preference.find((value) => supported.includes(value)) || model?.defaultReasoningEffort || supported[0];
}

function chooseModelForProfile(models, profile) {
  const visible = (models || []).filter((model) => !model.hidden);
  if (!visible.length) return { model: undefined, effort: undefined, catalogEntry: null };

  const byPattern = (patterns) => visible.find((entry) => {
    const name = `${entry.model || ""} ${entry.id || ""} ${entry.displayName || ""}`.toLowerCase();
    return patterns.some((pattern) => name.includes(pattern));
  });

  const preferred = profile === "DEEP"
    ? byPattern(["5.6-sol", "sol"])
    : profile === "FAST"
      ? byPattern(["5.6-luna", "luna"])
      : byPattern(["5.6-terra", "terra"]);

  const entry = preferred || visible.find((item) => item.isDefault) || visible[0];
  return {
    model: entry.model || entry.id,
    effort: effortForProfile(entry, profile),
    catalogEntry: entry,
  };
}

function capture(execFileFn, command, args, timeout = 7000) {
  return new Promise((resolve) => {
    execFileFn(command, args, { timeout, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: String(stdout || "").trim(),
        stderr: String(stderr || "").trim(),
        error: error ? safeString(error.message, 500) : "",
      });
    });
  });
}

function createCodexService({
  sendEvent = () => {},
  logger = null,
  stateStore = null,
  codexBin = process.env.BRACE_CODEX_BIN || "codex",
  spawnFn = spawn,
  execFileFn = execFile,
} = {}) {
  let child = null;
  let lineReader = null;
  let requestId = 1;
  let starting = null;
  let stopping = false;
  let restartTimer = null;
  let restartAttempts = 0;
  let status = "stopped";
  let lastError = "";
  let version = "";
  let account = null;
  let models = [];
  const persistedRuntime = stateStore?.readState?.().codexRuntime || {};
  let threadId = String(persistedRuntime.threadId || "");
  let currentTurnId = "";
  let currentCwd = String(persistedRuntime.cwd || "");
  let threadLoaded = false;
  let stderrTail = "";

  const pending = new Map();
  const turnWaiters = new Map();
  const turnBuffers = new Map();
  const finishedTurns = new Map();
  const approvalRequests = new Map();

  const log = (type, message, detail = {}, risk = "low", result) => {
    try {
      logger?.log?.(type, message, detail, risk, result);
    } catch {
      // Logging must never break the Codex runtime.
    }
  };

  const developerInstructions = [
    "You are the reasoning and execution engine for B.R.A.C.E, a local desktop assistant.",
    "Keep ordinary chat and simple one-step work single-threaded and fast.",
    "For genuinely complex work where parallel specialist effort materially improves correctness, you may use Codex collaboration/sub-agents, with at most 3 specialists active at once.",
    "Do not spawn collaborators for greetings, simple questions, app launches, or one-step edits.",
    "Respect the active sandbox and request approval for actions that require it.",
    "When using tools, report meaningful progress concisely rather than narrating every low-level operation.",
  ].join(" ");

  function persistThread() {
    if (!stateStore?.updateState) return;
    stateStore.updateState((state) => {
      state.codexRuntime = threadId
        ? { threadId, cwd: currentCwd, updatedAt: new Date().toISOString() }
        : { threadId: "", cwd: "", updatedAt: new Date().toISOString() };
      return state;
    });
  }

  const publicStatus = () => ({
    status,
    ready: status === "ready",
    authRequired: status === "auth-required",
    version,
    account: account ? { type: account.type, planType: account.planType || null } : null,
    modelCount: models.filter((item) => !item.hidden).length,
    models: models.filter((item) => !item.hidden).map((item) => ({
      id: item.id,
      model: item.model,
      displayName: item.displayName,
      isDefault: Boolean(item.isDefault),
      defaultReasoningEffort: item.defaultReasoningEffort,
      supportedReasoningEfforts: supportedEfforts(item),
    })),
    threadId: threadId || null,
    activeTurnId: currentTurnId || null,
    cwd: currentCwd || null,
    error: lastError || null,
  });

  const emitStatus = () => sendEvent("brace:codex-status", publicStatus());

  const setStatus = (next, error = "") => {
    status = next;
    lastError = error;
    emitStatus();
  };

  function write(message) {
    if (!child?.stdin?.writable) throw new Error("Codex app-server is not writable.");
    child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  function request(method, params = {}, timeout = DEFAULT_REQUEST_TIMEOUT) {
    if (!child || child.killed) return Promise.reject(new Error("Codex app-server is not running."));
    const id = requestId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(String(id));
        reject(new Error(`Codex request timed out: ${method}`));
      }, timeout);
      pending.set(String(id), { resolve, reject, timer, method });
      try {
        write({ id, method, params });
      } catch (error) {
        clearTimeout(timer);
        pending.delete(String(id));
        reject(error);
      }
    });
  }

  function notify(method, params = {}) {
    write({ method, params });
  }

  function respond(id, result) {
    write({ id, result });
  }

  function respondError(id, code, message) {
    write({ id, error: { code, message } });
  }

  function finishPendingWithError(error) {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    pending.clear();

    for (const entry of turnWaiters.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    turnWaiters.clear();
    currentTurnId = "";
  }

  function agentFromCollabItem(item) {
    const receiver = item.receiverThreadIds?.[0] || item.id;
    const prompt = safeString(item.prompt || "Delegated Codex work", 88);
    return {
      agent: receiver,
      agentName: "Codex Agent",
      detail: prompt,
    };
  }

  function handleThreadItem(method, params) {
    const item = params?.item;
    if (!item) return;

    if (item.type === "collabAgentToolCall") {
      const agent = agentFromCollabItem(item);
      if (method === "item/started") {
        sendEvent("brace:agent-event", {
          type: "agent.spawned",
          ...agent,
          status: "spawning",
          codexItemId: item.id,
          tool: item.tool,
        });
      } else if (method === "item/completed") {
        const failed = String(item.status || "").toLowerCase().includes("fail");
        sendEvent("brace:agent-event", {
          type: failed ? "agent.failed" : "agent.completed",
          ...agent,
          status: failed ? "failed" : "done",
          codexItemId: item.id,
          tool: item.tool,
        });
      }
      return;
    }

    if (item.type === "subAgentActivity") {
      sendEvent("brace:agent-event", {
        type: "agent.status",
        agent: item.agentThreadId || item.id,
        agentName: "Codex Agent",
        status: "working",
        detail: safeString(item.kind || "Working", 88),
        codexItemId: item.id,
      });
      return;
    }

    const summary = {
      type: method,
      itemType: item.type,
      id: item.id,
      status: item.status || null,
      command: item.type === "commandExecution" ? safeString(item.command, 180) : undefined,
      tool: item.type === "mcpToolCall" ? safeString(`${item.server} · ${item.tool}`, 120) : undefined,
      query: item.type === "webSearch" ? safeString(item.query || "", 180) : undefined,
    };
    sendEvent("brace:codex-event", summary);
  }

  function settleTurn(turn) {
    const turnId = turn?.id;
    if (!turnId) return;
    const statusValue = turn.status || "failed";
    const result = {
      ok: statusValue === "completed",
      turnId,
      status: statusValue,
      text: turnBuffers.get(turnId) || "",
      error: turn.error?.message || turn.error || null,
    };

    turnBuffers.delete(turnId);
    if (currentTurnId === turnId) currentTurnId = "";

    const waiter = turnWaiters.get(turnId);
    if (waiter) {
      clearTimeout(waiter.timer);
      turnWaiters.delete(turnId);
      if (result.ok) waiter.resolve(result);
      else waiter.reject(new Error(safeString(result.error || `Codex turn ${statusValue}.`, 500)));
    } else {
      finishedTurns.set(turnId, result);
      setTimeout(() => finishedTurns.delete(turnId), 30_000);
    }
    emitStatus();
  }

  function handleNotification(method, params) {
    if (method === "item/agentMessage/delta") {
      const turnId = params?.turnId || currentTurnId;
      const delta = String(params?.delta || "");
      if (turnId && delta) {
        turnBuffers.set(turnId, (turnBuffers.get(turnId) || "") + delta);
        sendEvent("brace:codex-delta", { turnId, delta });
      }
      return;
    }

    if (method === "item/completed" && params?.item?.type === "agentMessage") {
      const turnId = params?.turnId || currentTurnId;
      const text = String(params.item.text || "");
      if (turnId && text) turnBuffers.set(turnId, text);
    }

    if (method === "item/started" || method === "item/completed") {
      handleThreadItem(method, params);
    }

    if (method === "turn/plan/updated") {
      sendEvent("brace:codex-event", {
        type: "plan",
        turnId: params?.turnId || currentTurnId,
        plan: params?.plan || null,
      });
    }

    if (method === "turn/completed") {
      settleTurn(params?.turn || params);
      return;
    }

    if (method === "account/updated") {
      void refreshAccount();
    }
  }

  function handleServerRequest(message) {
    const id = message.id;
    const method = String(message.method || "");
    const params = message.params || {};

    if (method === "item/commandExecution/requestApproval" || method === "item/fileChange/requestApproval") {
      const key = String(id);
      approvalRequests.set(key, { id, method, params });
      sendEvent("brace:codex-approval", {
        id: key,
        method,
        kind: method.includes("commandExecution") ? "command" : "fileChange",
        threadId: params.threadId || null,
        turnId: params.turnId || null,
        itemId: params.itemId || null,
        command: params.command ? safeString(params.command, 1200) : null,
        cwd: params.cwd || null,
        reason: params.reason || null,
        riskLevel: "high",
      });
      return;
    }

    // Unknown interactive requests must fail closed rather than hanging Codex forever.
    respondError(id, -32601, `B.R.A.C.E does not support server request: ${method}`);
  }

  function handleMessage(message) {
    if (message && Object.prototype.hasOwnProperty.call(message, "id") && message.method) {
      handleServerRequest(message);
      return;
    }

    if (message && Object.prototype.hasOwnProperty.call(message, "id") && (message.result !== undefined || message.error)) {
      const entry = pending.get(String(message.id));
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(String(message.id));
      if (message.error) {
        const detail = message.error?.message || JSON.stringify(message.error);
        entry.reject(new Error(safeString(detail, 700)));
      } else {
        entry.resolve(message.result);
      }
      return;
    }

    if (message?.method) handleNotification(message.method, message.params || {});
  }

  function handleLine(line) {
    const trimmed = String(line || "").trim();
    if (!trimmed) return;
    try {
      handleMessage(JSON.parse(trimmed));
    } catch (error) {
      log("error", "Ignored malformed Codex app-server output.", { message: safeString(error.message), line: safeString(trimmed) }, "low", "error");
    }
  }

  async function probe() {
    const [versionResult, loginResult] = await Promise.all([
      capture(execFileFn, codexBin, ["--version"]),
      capture(execFileFn, codexBin, ["login", "status"]),
    ]);
    version = versionResult.ok ? versionResult.stdout : "";
    return {
      installed: versionResult.ok,
      version,
      loginStatus: loginResult.ok ? loginResult.stdout : "",
      loginOk: loginResult.ok,
      error: versionResult.ok ? (loginResult.ok ? "" : loginResult.stderr || loginResult.error) : versionResult.stderr || versionResult.error,
    };
  }

  async function refreshAccount() {
    if (!child) return null;
    try {
      const result = await request("account/read", { refreshToken: false }, 12_000);
      account = result?.account || null;
      if (result?.requiresOpenaiAuth && !account) setStatus("auth-required", "Sign in to Codex with ChatGPT.");
      else if (status !== "starting") setStatus("ready");
      return result;
    } catch (error) {
      log("error", `Codex account/read failed: ${error.message}`, {}, "low", "error");
      return null;
    }
  }

  async function refreshModels() {
    if (!child) return [];
    try {
      const result = await request("model/list", {}, 15_000);
      models = Array.isArray(result?.data) ? result.data : [];
      return models;
    } catch (error) {
      models = [];
      log("error", `Codex model/list failed: ${error.message}`, {}, "low", "error");
      return [];
    }
  }

  function scheduleRestart() {
    if (stopping || restartTimer || restartAttempts >= 3) return;
    const delay = Math.min(4000, 750 * (2 ** restartAttempts));
    restartAttempts += 1;
    setStatus("restarting", lastError || "Codex app-server exited.");
    restartTimer = setTimeout(() => {
      restartTimer = null;
      void start().catch((error) => {
        lastError = safeString(error.message, 500);
        scheduleRestart();
      });
    }, delay);
  }

  async function start() {
    if (status === "ready" && child && !child.killed) return publicStatus();
    if (starting) return starting;

    starting = (async () => {
      stopping = false;
      setStatus("starting");

      const probeResult = await probe();
      if (!probeResult.installed) {
        throw new Error("Codex CLI is not installed or not available on PATH.");
      }

      child = spawnFn(codexBin, ["app-server", "--listen", "stdio://"], {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        env: { ...process.env },
      });

      child.on("error", (error) => {
        lastError = safeString(error.message, 500);
        finishPendingWithError(error);
        setStatus("error", lastError);
      });

      child.on("exit", (code, signal) => {
        const error = new Error(`Codex app-server exited (${code ?? "?"}${signal ? `, ${signal}` : ""}).`);
        child = null;
        threadLoaded = false;
        lineReader?.close?.();
        lineReader = null;
        finishPendingWithError(error);
        if (!stopping) {
          lastError = stderrTail || error.message;
          scheduleRestart();
        }
      });

      child.stderr?.on("data", (chunk) => {
        stderrTail = safeString(`${stderrTail} ${String(chunk)}`, 1800);
      });

      lineReader = readline.createInterface({ input: child.stdout });
      lineReader.on("line", handleLine);

      await request("initialize", {
        clientInfo: {
          name: "brace_desktop",
          title: "B.R.A.C.E",
          version: "2.0.0",
        },
      }, 15_000);
      notify("initialized", {});

      const accountResult = await request("account/read", { refreshToken: false }, 12_000).catch(() => null);
      account = accountResult?.account || null;
      if (accountResult?.requiresOpenaiAuth && !account) {
        setStatus("auth-required", "Codex is not signed in. Run codex login.");
        return publicStatus();
      }

      await refreshModels();
      restartAttempts = 0;
      stderrTail = "";
      setStatus("ready");
      log("codex", "Codex app-server ready.", { version, models: models.length, accountType: account?.type || "unknown" });
      return publicStatus();
    })();

    try {
      return await starting;
    } catch (error) {
      setStatus("error", safeString(error.message, 500));
      try { child?.kill?.(); } catch {}
      child = null;
      throw error;
    } finally {
      starting = null;
    }
  }

  async function ensureReady() {
    if (status !== "ready" || !child) await start();
    if (status === "auth-required") throw new Error("Codex is not signed in. Run 'codex login' once, then retry.");
    if (status !== "ready") throw new Error(lastError || "Codex is not ready.");
  }

  async function ensureThread(cwd, model) {
    const normalizedCwd = path.resolve(cwd || process.cwd());

    if (threadId && currentCwd === normalizedCwd && threadLoaded) return threadId;

    if (threadId && currentCwd === normalizedCwd && !threadLoaded) {
      try {
        const resumed = await request("thread/resume", {
          threadId,
          cwd: normalizedCwd,
          model: model || null,
          approvalPolicy: "on-request",
          developerInstructions,
          excludeTurns: true,
        }, 20_000);
        const resumedId = resumed?.thread?.id || resumed?.threadId || threadId;
        threadId = resumedId;
        threadLoaded = true;
        persistThread();
        sendEvent("brace:codex-event", { type: "thread.resumed", threadId, cwd: currentCwd });
        emitStatus();
        return threadId;
      } catch (error) {
        log("codex", "Saved Codex thread could not be resumed; starting a fresh thread.", { threadId, error: safeString(error.message, 500) }, "low");
        threadId = "";
        currentCwd = "";
        threadLoaded = false;
        persistThread();
      }
    }

    const result = await request("thread/start", {
      cwd: normalizedCwd,
      model: model || null,
      approvalPolicy: "on-request",
      developerInstructions,
      ephemeral: false,
      serviceName: "B.R.A.C.E",
    }, 20_000);

    threadId = result?.thread?.id || result?.threadId || "";
    if (!threadId) throw new Error("Codex did not return a thread ID.");
    currentCwd = normalizedCwd;
    threadLoaded = true;
    persistThread();
    sendEvent("brace:codex-event", { type: "thread.started", threadId, cwd: currentCwd });
    emitStatus();
    return threadId;
  }

  async function run(prompt, options = {}) {
    await ensureReady();

    const decision = routeLocalDecision(prompt);
    const selection = chooseModelForProfile(models, options.profile || decision.profile);
    const cwd = path.resolve(options.cwd || process.cwd());
    const activeThread = await ensureThread(cwd, selection.model);

    const writable = decision.category === "coding" || decision.category === "files" || options.workspaceWrite === true;
    const sandboxPolicy = writable
      ? { type: "workspaceWrite", writableRoots: [cwd], networkAccess: Boolean(decision.networkAccess) }
      : { type: "readOnly", networkAccess: Boolean(decision.networkAccess) };

    sendEvent("brace:codex-event", {
      type: "turn.starting",
      profile: decision.profile,
      category: decision.category,
      model: selection.model || null,
      effort: selection.effort || null,
      networkAccess: decision.networkAccess,
    });

    const result = await request("turn/start", {
      threadId: activeThread,
      input: [{ type: "text", text: String(prompt || "") }],
      cwd,
      model: selection.model || null,
      effort: selection.effort || null,
      approvalPolicy: "on-request",
      sandboxPolicy,
    }, 20_000);

    const turnId = result?.turn?.id || result?.turnId || "";
    if (!turnId) throw new Error("Codex did not return a turn ID.");
    currentTurnId = turnId;
    turnBuffers.set(turnId, "");
    emitStatus();

    const alreadyFinished = finishedTurns.get(turnId);
    if (alreadyFinished) {
      finishedTurns.delete(turnId);
      return { ...alreadyFinished, decision, model: selection.model, effort: selection.effort, threadId: activeThread };
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        turnWaiters.delete(turnId);
        void interrupt().catch(() => {});
        reject(new Error("Codex turn timed out and was interrupted."));
      }, options.timeoutMs || DEFAULT_TURN_TIMEOUT);

      turnWaiters.set(turnId, {
        timer,
        resolve: (value) => resolve({ ...value, decision, model: selection.model, effort: selection.effort, threadId: activeThread }),
        reject,
      });
    });
  }

  async function interrupt() {
    if (!currentTurnId || !threadId || !child) return { ok: true, interrupted: false };
    const target = currentTurnId;
    try {
      await request("turn/interrupt", { threadId, turnId: target }, 10_000);
      return { ok: true, interrupted: true, turnId: target };
    } finally {
      currentTurnId = "";
      emitStatus();
    }
  }

  async function newThread() {
    if (currentTurnId) await interrupt().catch(() => {});
    threadId = "";
    currentCwd = "";
    threadLoaded = false;
    persistThread();
    emitStatus();
    return { ok: true };
  }

  function respondApproval(id, allow, forSession = false) {
    const entry = approvalRequests.get(String(id));
    if (!entry) throw new Error("Codex approval request is no longer pending.");
    const decision = allow ? (forSession ? "acceptForSession" : "accept") : "decline";
    respond(entry.id, { decision });
    approvalRequests.delete(String(id));
    return { ok: true, decision };
  }

  async function stop() {
    stopping = true;
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    finishPendingWithError(new Error("Codex service stopped."));
    try { lineReader?.close?.(); } catch {}
    lineReader = null;
    try { child?.kill?.("SIGTERM"); } catch {}
    child = null;
    setStatus("stopped");
  }

  return {
    probe,
    start,
    stop,
    run,
    interrupt,
    newThread,
    refreshAccount,
    refreshModels,
    respondApproval,
    status: publicStatus,
  };
}

module.exports = {
  createCodexService,
  chooseModelForProfile,
  effortForProfile,
};
