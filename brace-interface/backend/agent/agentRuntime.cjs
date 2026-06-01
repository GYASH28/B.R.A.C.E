const { callProvider } = require("../ai/providerRouter.cjs");
const { requiresApproval } = require("../security/safetyClassifier.cjs");
const { classifyIntent } = require("./intentClassifier.cjs");
const { buildContext } = require("./contextBuilder.cjs");
const { createPlan } = require("./planner.cjs");
const { recoverySuggestion } = require("./errorRecovery.cjs");
const { formatApproval, formatTaskResult } = require("./responseFormatter.cjs");

function createAgentRuntime({ stateStore, memoryManager, logger, taskState, approvals, executor, sendEvent }) {
  async function run({ command, selectedFile, workspacePath }) {
    const taskContext = buildContext({ state: stateStore.readState(), memoryManager, selectedFile, workspacePath });
    const classification = classifyIntent(command);

    if (classification.intent === "chat_only" || classification.intent === "planning") {
      try {
        const result = await callProvider(stateStore.readState().settings, command, taskContext);
        logger.log("ai", `AI response completed using ${result.provider}`, { command }, "low");
        return { ok: true, mode: "chat", text: result.text, provider: result.provider, classification };
      } catch (error) {
        logger.log("error", `AI request failed: ${error.message}`, { command }, "medium", "error");
        return { ok: false, mode: "chat", text: `AI error: ${error.message}`, error: error.message, recovery: recoverySuggestion(error), classification };
      }
    }

    const task = createPlan({ command, classification, state: stateStore.readState(), context: taskContext });
    taskState.saveTask(task);
    logger.log("agent", `Plan generated: ${task.intent}`, { task }, task.riskLevel);
    sendEvent?.("brace:agent-event", { taskId: task.id, type: "plan", task });

    if (!task.steps.length) {
      return { ok: true, mode: "agent", task, text: "I understood the request, but I need a selected file/folder or project path before I can safely act." };
    }
    if (task.riskLevel === "blocked") {
      taskState.updateTask(task.id, { status: "blocked" });
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
      sendEvent?.("brace:agent-event", { taskId, type: "status", message: "Executing approved plan." });
      const outputs = await executor.executePlan(task, context);
      const updated = taskState.updateTask(taskId, { status: "completed", outputs });
      logger.log("agent", `Task completed: ${task.goal}`, { taskId, outputs }, task.riskLevel);
      return { ok: true, mode: "agent", task: updated || task, outputs, text: formatTaskResult(task, outputs) };
    } catch (error) {
      const updated = taskState.updateTask(taskId, { status: "failed", error: error.message, recovery: recoverySuggestion(error) });
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
    return { ok: true, approval, text: "Approval rejected. I did not run the task." };
  }

  function cancel(taskId) {
    taskState.updateTask(taskId, { status: "cancelled" });
    logger.log("agent", `Task cancelled: ${taskId}`);
    return { ok: true };
  }

  return { approve, cancel, reject, run };
}

module.exports = { createAgentRuntime };
