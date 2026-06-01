const path = require("node:path");
const { requirePermission, touchPermission } = require("../security/permissionManager.cjs");

function collectPaths(input) {
  const values = [];
  for (const [key, value] of Object.entries(input || {})) {
    if (typeof value === "string" && /path$/i.test(key)) values.push(value);
  }
  return values;
}

function createExecutor({ toolRouter, stateStore, memoryManager, logger, pathGuard }) {
  async function executeStep(step, context = {}) {
    const state = stateStore.readState();
    if (step.riskLevel === "blocked") throw new Error("This action is blocked by the safety model.");
    requirePermission(state, step.requiredPermission);
    for (const candidatePath of collectPaths(step.input)) {
      const decision = pathGuard.isAllowed(path.resolve(candidatePath), { userSelected: context.userSelectedPaths?.includes(candidatePath) });
      if (!decision.allowed) throw new Error(decision.reason);
    }
    touchPermission(state, step.requiredPermission);
    stateStore.writeState(state);

    if (step.tool === "memory.save") {
      const memory = memoryManager.saveMemory({ ...step.input, approved: true });
      logger.log("memory", `Saved memory: ${memory.title}`, { id: memory.id, type: memory.type }, step.riskLevel);
      return memory;
    }

    const output = await toolRouter.execute(step.tool, step.input, context);
    logger.log("tool", `Tool ran: ${step.tool}`, { input: step.input, output }, step.riskLevel);
    stateStore.updateState((nextState) => {
      nextState.recentToolCalls = [{ time: new Date().toISOString(), tool: step.tool, riskLevel: step.riskLevel }, ...(nextState.recentToolCalls || [])].slice(0, 50);
      return nextState;
    });
    return output;
  }

  async function executePlan(task, context = {}) {
    const outputs = [];
    for (const step of task.steps || []) {
      const started = { ...step, status: "running", startedAt: new Date().toISOString() };
      const output = await executeStep(started, context);
      outputs.push({ stepId: step.id, tool: step.tool, output });
    }
    return outputs;
  }

  return { executePlan, executeStep };
}

module.exports = { createExecutor };
