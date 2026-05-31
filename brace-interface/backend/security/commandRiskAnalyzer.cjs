const BLOCKED_PATTERNS = [
  /\b(format|cipher\s+\/w|diskpart|bcdedit)\b/i,
  /\b(reg\s+delete|Set-ItemProperty\s+.*\\Run|schtasks\s+\/create)\b/i,
  /\b(netsh\s+advfirewall\s+set|Set-MpPreference|DisableRealtimeMonitoring)\b/i,
  /\b(mimikatz|lsass|procdump.*lsass|credential|dumpcred)\b/i,
  /\b(keylogger|GetAsyncKeyState|SetWindowsHookEx)\b/i,
  /\b(rm\s+-rf\s+\/|Remove-Item\s+.*-Recurse.*(?:C:\\|\\Windows|\\System32)|Remove-Item\s+.*(?:C:\\|\\Windows|\\System32).*-Recurse|del\s+\/[sq]\s+C:\\)/i,
  /\b(iwr|irm|curl|wget)\b.*\|\s*(iex|Invoke-Expression|powershell|pwsh|cmd|bash|sh)\b/i,
  /\bInvoke-WebRequest\b.*\bInvoke-Expression\b/i,
];

const HIGH_PATTERNS = [
  /\b(npm|pnpm|yarn|pip|uv|cargo|composer)\s+(install|add|update|upgrade)\b/i,
  /\b(git\s+push|git\s+clean|git\s+reset\s+--hard)\b/i,
  /\b(Remove-Item|rm|del|rmdir)\b/i,
  /\b(Start-Process\s+-Verb\s+RunAs|sudo|runas)\b/i,
  /\b(Set-ExecutionPolicy|New-Service|sc\s+create)\b/i,
];

const MEDIUM_PATTERNS = [
  /\b(npm|pnpm|yarn)\s+(run\s+)?(build|test|dev|lint)\b/i,
  /\b(git\s+(status|diff|log|branch|checkout|switch|pull|fetch))\b/i,
  /\b(node|python|py|powershell|pwsh|cmd)\b/i,
];

function analyzeCommandRisk(command) {
  const text = String(command ?? "").trim();
  if (!text) return { riskLevel: "blocked", reason: "Empty commands are not executable." };

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { riskLevel: "blocked", reason: "Command matches a blocked destructive, credential, persistence, or download-execute pattern." };
    }
  }
  if (/^[\w.-]+(\.exe)?\s+(--version|-v|version)$/i.test(text)) {
    return { riskLevel: "low", reason: "Command only checks a tool version." };
  }
  for (const pattern of HIGH_PATTERNS) {
    if (pattern.test(text)) return { riskLevel: "high", reason: "Command may install packages, delete data, elevate privileges, or publish changes." };
  }
  for (const pattern of MEDIUM_PATTERNS) {
    if (pattern.test(text)) return { riskLevel: "medium", reason: "Command can execute code or inspect/modify project state." };
  }
  return { riskLevel: "low", reason: "Command appears read-only or low impact." };
}

module.exports = { analyzeCommandRisk };
