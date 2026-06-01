# B.R.A.C.E Implementation Plan

## Current Diagnosis
- B.R.A.C.E is an Electron desktop app using React 19, Vite, TypeScript, Tailwind v4, and npm.
- The root folder is also the local B.R.A.C.E knowledge vault; `brace-interface` is the desktop control layer.
- The old backend lived mostly in `electron/main.cjs`. It had useful pieces, but no modular agent runtime, tool registry, approval manager, memory manager, project system, or MCP/browser architecture.
- The cleanup task used permanent deletion. This has been replaced with safe preview flow and recycle-bin file deletion tools.
- The app now builds with `npm run build`, and backend tests run with `npm test`.

## Recommended Architecture
- Keep an embedded Electron backend rather than a separate localhost server.
- Load backend modules from `brace-interface/backend`.
- Store operational app state and secrets in Electron `userData`.
- Store user-visible memory and notes in the vault under `_BRACE_DATA`.
- Treat every tool call as a routed, logged action with permission and risk metadata.

## Features Implemented First
- Agent runtime: intent classification, context building, planning, approval requests, execution, task history, recovery messages.
- AI provider router: Ollama, Gemini, OpenAI-compatible, OpenRouter-compatible, LM Studio-compatible, custom endpoint.
- Tool registry: file, folder organizer, command, app, coding, system, browser status, MCP status.
- Local memory: save/search/edit/delete JSON memory with secret redaction.
- Notes and projects: vault-backed notes and project scanning.
- UI wiring: Chat now calls the agent runtime; Memory, Notes, Tools, Projects, and Agent pages are visible and functional.

## APIs Created
- Agent: `agent:run`, `agent:approve`, `agent:reject`, `agent:cancel`, `agent:list`.
- Tools: `tools:list`, `tools:dry-run`.
- Memory: `memory:list`, `memory:search`, `memory:save`, `memory:update`, `memory:delete`.
- Notes: `notes:list`, `notes:search`, `notes:create`, `notes:read`, `notes:update`, `notes:delete`.
- Projects: `projects:list`, `projects:add`, `projects:scan`.
- AI: `ai:test`.

## Files Changed
- Added modular backend under `brace-interface/backend`.
- Replaced `brace-interface/electron/main.cjs` with a thin Electron IPC host.
- Extended `brace-interface/electron/preload.cjs`.
- Updated React pages, types, navigation, dashboard status, and settings.
- Added `.env.example`, backend tests, root docs, and README updates.

## Testing Checklist
- `npm test`: backend safety/memory/intent/tool tests.
- `npm run build`: TypeScript and Vite production build.
- `npm audit`: dependency audit result is tracked in the final report.
- Manual checks: chat agent plan, approval card, memory save/search, notes create/delete, tools list, project scan, system monitor permission.

## Future Extension Points
- Add live streaming token support per provider.
- Add Playwright browser session controls behind browser permission.
- Add real MCP client process manager.
- Add vector memory without replacing JSON memory.
- Add richer diff viewer for coding edits.
