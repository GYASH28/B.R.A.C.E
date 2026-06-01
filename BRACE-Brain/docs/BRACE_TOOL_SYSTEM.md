# B.R.A.C.E Tool System

## Tool Shape
Each tool is registered with:
- `name`
- `description`
- `inputSchema`
- `outputSchema`
- `riskLevel`
- `requiredPermission`
- `supportsDryRun`
- `execute`

## Current Tool Groups
- File tools: read, write with backup, create folder, search, extract text, summarize, recycle-bin delete.
- Folder organizer: preview, execute category moves, undo file.
- Command tools: explain and run controlled commands.
- App tools: open VS Code, folders, URLs, and configured apps.
- Coding tools: scan project, propose edit, apply edit with backup.
- System tools: OS, CPU, RAM, disk, GPU, network, battery.
- Browser tools: configured status placeholder.
- MCP tools: server config/status placeholder.

## Routing
- The renderer cannot call arbitrary Node APIs.
- Electron preload exposes only typed IPC methods.
- Agent plans call tools through `toolRouter`.
- Executor checks permission and path guard before running tools.

## Logging
Tool calls write human-readable activity logs:
- timestamp
- tool name
- input summary
- risk level
- result
- error details when applicable
