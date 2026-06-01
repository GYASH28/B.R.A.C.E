# B.R.A.C.E Knowledge Brain

B.R.A.C.E means Brain / Responsive / Agentic / Companion / Engine.

This folder is both the local knowledge vault and the home for the B.R.A.C.E desktop assistant.

## Main App
The Electron interface lives here:

```text
C:\Users\Admin\Documents\BRACE-Brain\brace-interface
```

Run it:

```powershell
cd "C:\Users\Admin\Documents\BRACE-Brain\brace-interface"
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Build it:

```powershell
npm run build
npm run desktop
```

## What B.R.A.C.E Does
- Connects chat to a real local agent runtime.
- Routes actions through permissioned tools.
- Supports Ollama, Gemini, OpenAI-compatible, OpenRouter-compatible, LM Studio, and custom endpoints.
- Provides a rebuilt voice-agent interface with orb states, push-to-talk, silence detection, interruption, voice preview, and local-provider detection.
- Stores local memory and notes under `_BRACE_DATA`.
- Logs actions, approvals, tool calls, and errors.
- Uses approval cards for medium and high-risk actions.

## Documentation
- [Implementation Plan](docs/BRACE_IMPLEMENTATION_PLAN.md)
- [Security Model](docs/BRACE_SECURITY_MODEL.md)
- [Tool System](docs/BRACE_TOOL_SYSTEM.md)
- [User Guide](docs/BRACE_USER_GUIDE.md)
- [Voice Diagnosis](docs/BRACE_VOICE_DIAGNOSIS.md)
- [Voice Setup](docs/BRACE_VOICE_SETUP.md)
- [Voice Architecture](docs/BRACE_VOICE_ARCHITECTURE.md)
