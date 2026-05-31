# B.R.A.C.E Interface

B.R.A.C.E means Brain / Responsive / Agentic / Companion / Engine.

This is a React + Vite + Tailwind + Electron local Windows PC AI assistant. The interface talks to an embedded modular backend in `backend/`, exposed through safe Electron IPC.

## Setup
```powershell
npm install
```

Copy local configuration placeholders if needed:

```powershell
copy .env.example .env
```

Do not commit real API keys.

## Run Frontend
```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

## Run Desktop
```powershell
npm run desktop
```

## Build
```powershell
npm run build
```

## Test
```powershell
npm test
```

## AI Providers
Settings supports:
- Ollama local models
- Gemini
- OpenAI-compatible APIs
- OpenRouter-compatible APIs
- LM Studio local server
- Custom HTTP endpoint

Use the Settings page Test connection button before relying on a provider.

## Local Ollama
1. Install Ollama.
2. Pull a model, for example `ollama pull llama3.2`.
3. In Settings, choose Ollama.
4. Set endpoint `http://127.0.0.1:11434`.
5. Set model `llama3.2`.

## Permissions
Open Access and enable only the capabilities you want:
- AI model access
- Local file read/write
- Folder organization
- Terminal commands
- App launching
- Browser automation
- Coding agent edits
- Memory read/write
- System info
- Git and MCP tools

## Coding Agent
Use Projects to add a project path. B.R.A.C.E can scan framework files, package scripts, and git status. Edits and command execution require approval.

## Memory
Memory is local and user-visible in:

```text
C:\Users\Admin\Documents\BRACE-Brain\_BRACE_DATA\memory
```

Notes are stored in:

```text
C:\Users\Admin\Documents\BRACE-Brain\_BRACE_DATA\notes
```

Secrets are redacted before memory and logs are written.

## Voice
B.R.A.C.E includes a rebuilt voice agent:
- Orb states: idle, listening, thinking, speaking, muted, error, offline.
- Push-to-talk and click-to-stop.
- Web Audio mic level and silence detection.
- Browser fallback STT/TTS that works without setup.
- Local provider detection for faster-whisper, Kokoro, Piper, Silero VAD, and edge-tts.
- Interruption support: speaking is cancelled when a new voice turn starts.

Optional local setup:

```powershell
cd "C:\Users\Admin\Documents\BRACE-Brain"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-voice.txt
```

Voice documentation:
- `docs/BRACE_VOICE_SETUP.md`
- `docs/BRACE_VOICE_ARCHITECTURE.md`
- `docs/BRACE_VOICE_DIAGNOSIS.md`

## Troubleshooting
- Provider unavailable: check Settings and Test connection.
- Permission disabled: enable the named permission in Access.
- Command blocked: remove destructive, admin, persistence, credential, or download-execute behavior.
- File blocked: select the file/folder explicitly or use a configured safe folder.
- Mic issue: use Voice Settings > Test mic, check Windows microphone permission, or switch to Browser Fallback.
- Robotic voice: install Kokoro/Piper or select a better installed browser/system voice.
- Build issue: run `npm test` and `npm run build` for the exact error.
