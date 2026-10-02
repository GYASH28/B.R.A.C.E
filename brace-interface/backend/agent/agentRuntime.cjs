const { callProvider } = require("../ai/providerRouter.cjs");
const { runSubagent } = require("../agents/subagentManager.cjs");
const { routeTask } = require("../agents/modelRouter.cjs");
const { requiresApproval } = require("../security/safetyClassifier.cjs");
const { classifyIntent } = require("./intentClassifier.cjs");
const { buildContext } = require("./contextBuilder.cjs");
const { createPlan } = require("./planner.cjs");
const { recoverySuggestion } = require("./errorRecovery.cjs");
const { formatApproval, formatTaskResult } = require("./responseFormatter.cjs");

function createAgentRuntime({ stateStore, memoryManager, logger, taskState, approvals, executor, sendEvent, getSettings }) {
  async function run({ command, selectedFile, workspacePath }) {
    const taskContext = buildContext({ state: stateStore.readState(), memoryManager, selectedFile, workspacePath });
    const classification = classifyIntent(command);

    if (classification.intent === "chat_only" || classification.intent === "planning" || classification.intent === "research") {
      let activeRoute = null;
      try {
        const settings = getSettings ? getSettings() : stateStore.readState().settings;
        const useOrchestrator = settings.aiProvider === "openai" && settings.orchestratedAI !== false;

        if (useOrchestrator) {
          activeRoute = routeTask(command);
          sendEvent?.("brace:agent-event", {
            type: "agent.spawned",
            agent: activeRoute.agent.id,
            agentName: activeRoute.agent.name,
            status: "spawning",
            detail: activeRoute.agent.description,
          });
          sendEvent?.("brace:agent-event", {
            type: "agent.status",
            agent: activeRoute.agent.id,
            agentName: activeRoute.agent.name,
            status: "working",
            detail: classification.intent === "research" ? "Researching the request" : "Working on the request",
          });
        }

        const result = useOrchestrator
          ? await runSubagent({
              settings,
              task: command,
              context: {
                recentConversation: taskContext.recentConversation || "",
                workspacePath,
              },
              requestedAgent: activeRoute?.agent?.id,
            })
          : await callProvider(settings, command, taskContext);

        const provider = result.agentName ? `${result.agentName} · ${result.model}` : result.provider;
        logger.log("ai", `AI response completed using ${provider}`, { command, model: result.model, agent: result.agent }, "low");

        if (activeRoute) {
          sendEvent?.("brace:agent-event", {
            type: "agent.completed",
            agent: result.agent || activeRoute.agent.id,
            agentName: result.agentName || activeRoute.agent.name,
            status: "done",
            detail: "Completed",
          });
        }

        return {
          ok: true,
          mode: "chat",
          text: result.text,
          provider,
          model: result.model,
          agent: result.agent,
          agentName: result.agentName,
          effort: result.effort,
          sources: result.sources || [],
          estimatedCostUsd: result.estimatedCostUsd ?? null,
          classification,
        };
      } catch (error) {
        if (activeRoute) {
          sendEvent?.("brace:agent-event", {
            type: "agent.failed",
            agent: activeRoute.agent.id,
            agentName: activeRoute.agent.name,
            status: "failed",
            detail: error.message,
          });
        }
        logger.log("error", `AI request failed: ${error.message}`, { command }, "medium", "error");
        return { ok: false, mode: "chat", text: `AI error: ${error.message}`, error: error.message, recovery: recoverySuggestion(error), classification };
      }
    }

    const task = createPlan({ command, classification, state: stateStore.readState(), context: taskContext });
    taskState.saveTask(task);
    logger.log("agent", `Plan generated: ${task.intent}`, { task }, task.riskLevel);
    sendEvent?.("brace:agent-event", { taskId: task.id, type: "task.plan", task });

    if (!task.steps.length) {
      sendEvent?.("brace:agent-event", { taskId: task.id, type: "task.completed", message: "Waiting for required context." });
      return { ok: true, mode: "agent", task, text: "I understood the request, but I need a selected file/folder or project path before I can safely act." };
    }
    if (task.riskLevel === "blocked") {
      taskState.updateTask(task.id, { status: "blocked" });
      sendEvent?.("brace:agent-event", { taskId: task.id, type: "task.failed", message: "Blocked by the safety model." });
      return { ok: false, mode: "agent", task, text: "This task is blocked by the safety model." };
    }
    if (requiresApproval(task.riskLevel)) {
      const approval = approvals.requestApproval({ ...task, status: "waiting_approval" }, "Medium/high risk actions need review before execution.");
      taskState.updateTask(task.id, { status: "waiting_approval", approvalId: approval.id });
      sendEvent?.("brace:approval-request", approval);
      return { ok: true, mode: "approval", task, approval, text: formatApproval(task, approval) };
    }

    return executeApprovedTask(task.id, { selectedFile, workspacePath, userSelectedPaths: selectedFile?.path ? [selectedFile.path] : [] });
  }

  async function executeApprovedTask(taskId, context = {}) {
    const task = taskState.getTask(taskId);
    if (!task) throw new Error("Task not found.");
    taskState.updateTask(taskId, { status: "running" });
    try {
      sendEvent?.("brace:agent-event", { taskId, type: "task.status", message: "Executing approved plan." });
      const outputs = await executor.executePlan(task, context);
      const updated = taskState.updateTask(taskId, { status: "completed", outputs });
      sendEvent?.("brace:agent-event", { taskId, type: "task.completed", message: "Task completed." });
      logger.log("agent", `Task completed: ${task.goal}`, { taskId, outputs }, task.riskLevel);
      return { ok: true, mode: "agent", task: updated || task, outputs, text: formatTaskResult(task, outputs) };
    } catch (error) {
      const updated = taskState.updateTask(taskId, { status: "failed", error: error.message, recovery: recoverySuggestion(error) });
      sendEvent?.("brace:agent-event", { taskId, type: "task.failed", message: error.message });
      logger.log("error", `Task failed: ${error.message}`, { taskId }, task.riskLevel, "error");
      return { ok: false, mode: "agent", task: updated || task, error: error.message, recovery: recoverySuggestion(error), text: `Task failed: ${error.message}\n\nRecovery: ${recoverySuggestion(error)}` };
    }
  }

  async function approve(approvalId) {
    const approval = approvals.resolveApproval(approvalId, true);
    taskState.updateTask(approval.taskId, { status: "approved" });
    return executeApprovedTask(approval.taskId);
  }

  function reject(approvalId) {
    const approval = approvals.resolveApproval(approvalId, false);
    taskState.updateTask(approval.taskId, { status: "rejected" });
    logger.log("approval", `Approval rejected for task ${approval.taskId}`, { approvalId }, approval.riskLevel, "rejected");
    sendEvent?.("brace:agent-event", { taskId: approval.taskId, type: "task.failed", message: "Approval rejected." });
    return { ok: true, approval, text: "Approval rejected. I did not run the task." };
  }

  function cancel(taskId) {
    taskState.updateTask(taskId, { status: "cancelled" });
    logger.log("agent", `Task cancelled: ${taskId}`);
    sendEvent?.("brace:agent-event", { taskId, type: "task.failed", message: "Task cancelled." });
    return { ok: true };
  }

  return { approve, cancel, reject, run };
}

module.exports = { createAgentRuntime };
