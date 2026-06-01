function createStreamingHandler(sender) {
  return {
    emitStatus(taskId, message) {
      sender?.("brace:agent-event", { taskId, type: "status", message, time: new Date().toISOString() });
    },
    emitToken(taskId, token) {
      sender?.("brace:agent-event", { taskId, type: "token", token, time: new Date().toISOString() });
    },
  };
}

module.exports = { createStreamingHandler };
