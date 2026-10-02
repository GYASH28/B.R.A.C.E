<div align="center">

# B.R.A.C.E

### Brain · Responsive · Agentic · Companion · Engine

**A local-first, Codex-native desktop AI presence for Kubuntu.**

</div>

## What this branch is

The Codex-native B.R.A.C.E rebuild replaces the old dashboard-first experience with a minimal full-screen assistant:

- a reactive orb in the center
- a single composer at the bottom
- transient conversation text
- agent nodes that appear only when Codex actually delegates work
- compact approval cards for command/file actions
- local Second Brain retrieval
- local speech-to-text and text-to-speech

The normal intelligence path uses the locally installed **Codex CLI / app-server** and your existing Codex ChatGPT sign-in. The fresh interface does **not** require an OpenAI API key.

## Architecture

```text
B.R.A.C.E Electron shell
        │
        ├── React orb-first UI
        │
        ├── Local voice
        │     ├── Faster-Whisper (CPU INT8)
        │     └── Kokoro 82M
        │
        ├── Second Brain
        │     └── local Markdown / Obsidian retrieval
        │
        └── CodexService
              └── codex app-server --listen stdio://
                    ├── ChatGPT-authenticated Codex
                    ├── streamed turns
                    ├── shell / file operations
                    ├── approvals
                    └── real collaboration/sub-agent events
```

The renderer never receives Codex auth tokens and cannot spawn arbitrary processes directly.

## Kubuntu setup

Requirements:

- Node.js 22.6+
- Python 3
- Codex CLI
- a Codex/ChatGPT account that is already signed in through the CLI

If Codex is not installed:

```bash
npm install -g @openai/codex@latest
codex login
```

Then:

```bash
git checkout feature/codex-native-brace
cd brace-interface
chmod +x scripts/setup-jarvis.sh scripts/setup-local-voice.sh
./scripts/setup-jarvis.sh
npm run launch
```

Optional local skill library:

```bash
./scripts/setup-jarvis.sh --skills
```

Skip voice installation if you only want typed Codex use:

```bash
./scripts/setup-jarvis.sh --no-voice
```

The setup script:

1. verifies Node and Codex
2. verifies `codex login status`
3. installs Node dependencies
4. creates an isolated local voice venv
5. installs Faster-Whisper, Kokoro, eSpeak NG, and required Python packages
6. runs tests
7. builds the production interface
8. installs KDE autostart

No OpenAI API key setup is part of the Codex-native interface.

## Interface

The primary UI deliberately has no permanent sidebar or dashboard.

Orb states include:

- idle
- listening
- transcribing
- thinking
- planning
- delegating
- working
- speaking
- awaiting approval
- success
- error
- offline

The orb is Canvas-based and reduces its frame rate while idle/hidden.

## Codex runtime

B.R.A.C.E keeps one local `codex app-server` process alive instead of spawning a new CLI process for every message.

The runtime supports:

- `initialize`
- account status
- model catalog discovery
- `thread/start`
- `turn/start`
- streamed `item/agentMessage/delta`
- `turn/interrupt`
- command/file approvals
- crash recovery
- real Codex collaboration events for transient agent nodes

FAST / NORMAL / DEEP routing is decided locally first. Model selection is made only from the catalog exposed by the installed Codex runtime.

## Second Brain

Use **Ctrl+K → Second Brain** to connect your local Obsidian/Markdown folder.

B.R.A.C.E:

- keeps the vault local
- retrieves only relevant text notes
- caps injected context
- redacts common secrets before context is sent to Codex
- labels retrieved material as reference data, not instructions

The whole vault is never blindly inserted into a prompt.

## Local voice

The default voice pipeline is:

```text
microphone
   ↓
MediaRecorder
   ↓
Faster-Whisper (local CPU INT8)
   ↓
Codex
   ↓
sentence streaming
   ↓
Kokoro 82M (local)
   ↓
Web Audio
   ↓
speakers
```

The default TTS voice is `bm_george`.

As Codex streams text, complete sentences are queued to Kokoro so speech can begin before the full answer is finished.

Clicking the orb/mic while audio is playing stops playback and returns to listening.

## Fullscreen

B.R.A.C.E launches fullscreen on Kubuntu.

- **Esc** exits fullscreen
- **F11** toggles fullscreen
- **Ctrl+K** opens the minimal command palette
- **Ctrl+Alt+Space** starts/stops voice

## Build and test

```bash
cd brace-interface
npm test
npm run build
npm run dist:linux
```

The Linux package includes the Python voice worker outside ASAR so it remains executable from the AppImage.

## Current migration note

Some legacy provider/GPT-Live source files remain in the repository for history and comparison, but the Codex-native renderer bridge no longer exposes the old direct-cloud chat, GPT-Live, or API-key-saving paths.

The active rebuild is tracked on the draft pull request for `feature/codex-native-brace`.

## Safety

- Codex auth stays owned by Codex.
- The renderer has context isolation and no Node integration.
- Codex uses explicit sandbox/approval policies.
- Commands and file writes can require approval.
- The Second Brain remains local.
- Raw microphone recordings are temporary and removed after local transcription.
- The normal Codex-native interface does not store an OpenAI API key.

## Status

This branch is still under active verification. Do not merge it into `main` until local Kubuntu smoke tests, real Codex execution, voice, and Second Brain retrieval are confirmed on the target machine.
