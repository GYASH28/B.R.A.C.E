function formatTaskResult(task, outputs) {
  if (!outputs?.length) {
    return `I created a plan for: ${task.goal}. It is waiting for approval before I touch anything.`;
  }
  const lines = outputs.map((item) => {
    const output = typeof item.output === "string" ? item.output : JSON.stringify(item.output, null, 2);
    return `- ${item.tool}: ${output.slice(0, 1000)}`;
  });
  return [`Done: ${task.goal}`, "", "Tool results:", ...lines].join("\n");
}

function formatApproval(task, approval) {
  const steps = (task.steps || []).map((step) => `- ${step.title}: ${step.tool} (${step.riskLevel})`).join("\n");
  return [`I need approval before continuing.`, "", `Risk level: ${task.riskLevel}`, `Approval ID: ${approval.id}`, "", "Planned steps:", steps].join("\n");
}

module.exports = { formatApproval, formatTaskResult };
