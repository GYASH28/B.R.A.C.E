function createTaskStateManager({ stateStore }) {
  function saveTask(task) {
    stateStore.updateState((state) => {
      state.agentTasks = [task, ...(state.agentTasks || []).filter((item) => item.id !== task.id)].slice(0, 100);
      return state;
    });
    return task;
  }

  function updateTask(taskId, patch) {
    let updated = null;
    stateStore.updateState((state) => {
      state.agentTasks = (state.agentTasks || []).map((task) => {
        if (task.id !== taskId) return task;
        updated = { ...task, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      });
      return state;
    });
    return updated;
  }

  function getTask(taskId) {
    return (stateStore.readState().agentTasks || []).find((task) => task.id === taskId);
  }

  function listTasks() {
    return stateStore.readState().agentTasks || [];
  }

  return { getTask, listTasks, saveTask, updateTask };
}

module.exports = { createTaskStateManager };
