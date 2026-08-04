<div align="center">

# B.R.A.C.E

### Brain · Responsive · Agentic · Companion · Engine

**A local-first AI companion, knowledge workspace, and permission-controlled desktop agent for Windows.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111827)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Electron](https://img.shields.io/badge/Electron-Desktop-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org)
[![Local First](https://img.shields.io/badge/Architecture-Local--First-22C55E?style=for-the-badge)](#architecture)

</div>

## Overview

**B.R.A.C.E** is an experimental personal AI operating layer built around a simple idea: an assistant should be able to understand your projects, knowledge, files, and workflows without silently taking control of your computer.

The project combines a structured Obsidian-compatible knowledge vault with a React and Electron interface, modular AI providers, local memory, voice interaction, project awareness, and explicit permission gates for sensitive actions.

> **Status:** Active personal R&D project. The repository contains both the knowledge-workspace structure and the desktop assistant interface.

## Core Capabilities

- Conversational AI with configurable cloud and local providers
- Local, user-visible memory and notes
- Obsidian-compatible knowledge vault and dashboards
- Voice input, speaking states, interruption, and TTS provider detection
- Project scanning, package-script awareness, and Git status inspection
- Permission-controlled file, terminal, browser, app, and coding tools
- Safe Electron IPC between the desktop interface and modular backend
- PDF and document parsing for local knowledge workflows
- Windows desktop packaging
- System-information and local-environment awareness

## Safety Model

B.R.A.C.E is designed around **explicit access instead of invisible authority**.

Sensitive capabilities are individually controlled:

- AI provider access
- Local file read and write
- Folder organization
- Terminal commands
- Application launching
- Browser automation
- Coding-agent edits
- Memory read and write
- System information
- Git and MCP tools

Command execution and code edits should require user approval. Secrets are expected to come from local environment configuration and must never be committed to Git.

## Architecture

| Layer | Responsibility |
|---|---|
| Knowledge vault | Structured notes, dashboards, projects, studies, journals, templates, and automation data |
| React interface | Chat, projects, access controls, settings, voice states, memory views, and system UI |
| Electron shell | Windows desktop runtime and safe IPC bridge |
| Modular backend | Agent runtime, provider routing, memory, security, documents, voice, and tools |
| AI providers | Ollama, Gemini, OpenAI-compatible APIs, OpenRouter-compatible APIs, LM Studio, and custom endpoints |
| Local data | User-visible notes, memory, settings, and logs |

## Technology Stack

| Area | Technology |
|---|---|
| Interface | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Motion and icons | Framer Motion, Lucide React |
| Desktop | Electron, electron-builder |
| Backend | Node.js modular CommonJS services |
| Documents | mammoth, pdf-parse |
| System integration | systeminformation |
| Testing | Node test runner, Playwright |
| Knowledge workspace | Markdown and Obsidian-compatible vault structure |

## Repository Structure

```text
.
├── 00_HOME/                 # Master dashboards and navigation
├── 01_PROJECTS/             # Project knowledge and execution notes
├── 05_STUDIES/              # Academic knowledge base
├── 10_AUTOMATION_SYSTEM/    # Automation scripts, state, and logs
├── _TEMPLATES/              # Reusable note templates
├── .obsidian/               # Vault configuration
└── brace-interface/         # React, Electron, and backend application
```

## Run the Interface

```bash
cd brace-interface
npm install
```

Create local configuration from the example file when required:

```powershell
copy .env.example .env
```

### Frontend Development

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

### Desktop Mode

```bash
npm run desktop
```

### Production Build

```bash
npm run build
```

### Windows Portable Build

```bash
npm run dist:win
```

### Tests

```bash
npm test
```

## Voice System

The voice experience supports:

- Idle, listening, thinking, speaking, muted, offline, and error states
- Push-to-talk and click-to-stop
- Microphone-level feedback and silence detection
- Browser fallback speech recognition and synthesis
- Detection of faster-whisper, Kokoro, Piper, Silero VAD, and edge-tts
- Interruption when a new voice turn begins

## Memory

B.R.A.C.E keeps memory and notes local and visible to the user. The exact storage path depends on the local configuration, but memory is designed to remain inspectable rather than hidden inside an opaque remote service.

Secrets should be redacted before memory or logs are written.

## Documentation

Detailed interface setup, provider configuration, voice architecture, and troubleshooting documentation is available inside:

```text
brace-interface/docs/
```

The interface-specific README is available at:

```text
brace-interface/README.md
```

## Security

Before running agentic features:

1. Use fresh API keys stored only in `.env` or an approved local secret store
2. Review every enabled permission
3. Keep terminal and file access limited to selected folders
4. Test provider connections from Settings
5. Review commands and edits before approval
6. Never commit `.env`, credentials, private vault content, build artifacts, or user data

## Vision

B.R.A.C.E is being developed as a personal companion that can connect knowledge, projects, voice, coding, and computer workflows while keeping the user in control of every meaningful action.

## License

This is a personal research and product-development project. All rights reserved unless a separate license is added.
