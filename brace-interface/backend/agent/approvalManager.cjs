function createApprovalManager({ stateStore }) {
  function requestApproval(task, reason) {
    const approval = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      taskId: task.id,
      status: "pending",
      reason,
      riskLevel: task.riskLevel,
      plan: task,
      createdAt: new Date().toISOString(),
    };
    stateStore.updateState((state) => {
      state.approvals = [approval, ...(state.approvals || []).filter((item) => item.taskId !== task.id)];
      return state;
    });
    return approval;
  }

  function resolveApproval(approvalId, approved) {
    let approval = null;
    stateStore.updateState((state) => {
      state.approvals = (state.approvals || []).map((item) => {
        if (item.id !== approvalId) return item;
        approval = { ...item, status: approved ? "approved" : "rejected", resolvedAt: new Date().toISOString() };
        return approval;
      });
      return state;
    });
    if (!approval) throw new Error("Approval not found.");
    return approval;
  }

  function listApprovals() {
    return stateStore.readState().approvals || [];
  }

  return { listApprovals, requestApproval, resolveApproval };
}

module.exports = { createApprovalManager };
