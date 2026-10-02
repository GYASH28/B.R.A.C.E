# B.R.A.C.E Interface — Codex Native

This folder contains the Electron + React desktop assistant.

## Setup

```bash
npm install -g @openai/codex@latest
codex login

chmod +x scripts/setup-jarvis.sh scripts/setup-local-voice.sh
./scripts/setup-jarvis.sh
npm run launch
```

The normal interface uses your local Codex ChatGPT sign-in. It does not require an OpenAI API key.

## Main UI

The production shell is intentionally minimal:

- fullscreen dark canvas
- reactive central orb
- transient streamed conversation
- bottom composer
- transient Codex agent nodes
- compact approval overlay
- Ctrl+K command palette

## Codex

`backend/codex/codexService.cjs` owns the long-lived local Codex app-server.

It handles:

- initialization
- account status
- model discovery
- threads
- turns
- streaming
- cancellation
- command/file approvals
- crash recovery
- Codex collaboration events

`backend/codex/localDecisionRouter.cjs` performs inexpensive FAST / NORMAL / DEEP routing before a Codex turn.

## Second Brain

`backend/brain/secondBrainService.cjs` retrieves relevant local notes from:

- the connected Second Brain / Obsidian vault
- BRACE local memories
- BRACE local notes

Use Ctrl+K → Second Brain to connect a folder.

## Local voice

```bash
./scripts/setup-local-voice.sh
```

The voice environment is installed under:

```text
~/.local/share/brace/voice/.venv
```

Primary stack:

- Faster-Whisper: local STT, CPU INT8
- Kokoro 82M: local TTS
- eSpeak NG: English G2P fallback

The Python worker lives at:

```text
scripts/voice/brace_voice_worker.py
```

The AppImage explicitly unpacks this file outside ASAR.

## Development

```bash
npm ci
npm test
npm run build
npm run launch
```

Development Vite:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

Linux package:

```bash
npm run dist:linux
```

## Controls

- Esc: exit fullscreen
- F11: toggle fullscreen
- Ctrl+K: command palette
- Ctrl+Alt+Space: voice
- Enter: send
- Shift+Enter: newline

## Important

Legacy provider and GPT-Live implementation files may still exist in the repository, but the Codex-native Electron preload no longer exposes those direct-cloud paths to the fresh UI.
