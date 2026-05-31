function recoverySuggestion(error) {
  const message = error?.message || "";
  if (/permission/i.test(message)) return "Enable the requested permission in Settings > Permissions, then retry the task.";
  if (/not found/i.test(message)) return "Check the path or select the file/folder again.";
  if (/timed out/i.test(message)) return "Retry with a longer timeout or run a smaller command.";
  if (/blocked/i.test(message)) return "Edit the action to a safer command or split it into reviewable steps.";
  return "Review the error, adjust the command or settings, and retry.";
}

module.exports = { recoverySuggestion };
