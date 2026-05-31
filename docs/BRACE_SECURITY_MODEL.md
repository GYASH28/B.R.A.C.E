# B.R.A.C.E Security Model

## Principles
- Local-first by default.
- No hidden background control.
- No UAC bypass.
- No credential scraping, keylogging, browser cookie reading, or silent file upload.
- Every meaningful action is permissioned, logged, and reviewable.

## Risk Levels
- Low: chat, local memory search, system status, tool listing.
- Medium: file reads, folder scans, opening apps/folders/URLs, project scans.
- High: file writes, folder moves, terminal commands, package installation, coding edits, git operations.
- Blocked: credential dumping, destructive system commands, antivirus/firewall disabling, persistence creation, download-and-execute chains, unsafe admin behavior.

## Approval Rules
- Low-risk actions can run after the relevant permission is enabled.
- Medium and high-risk agent plans generate approval cards.
- Rejected approvals do not execute.
- Blocked actions are refused with a reason and recovery suggestion.

## Path Safety
- Safe roots are configured in local settings.
- Windows system folders are blocked by default.
- User-selected files and folders are treated as explicitly scoped access.
- Delete tools use Electron `shell.trashItem`; permanent deletion is not used for user files.

## Command Safety
- Commands are classified before execution.
- Destructive, persistence, credential, and download-execute patterns are blocked.
- Package installs, git push/reset/clean, deletion, and admin commands are high risk.
- Commands capture stdout, stderr, exit code, runtime, and timeout result.

## Secrets
- API keys are never hardcoded.
- `.env.example` contains placeholders only.
- Memory and logs redact common secret patterns before storage.
