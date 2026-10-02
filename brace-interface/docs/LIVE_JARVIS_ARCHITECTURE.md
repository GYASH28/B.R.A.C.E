# B.R.A.C.E Live Jarvis Architecture

## Goal

B.R.A.C.E boots as a localhost-served Electron experience, keeps a voice-first orb as the primary UI, and uses a split intelligence architecture:

- **GPT-Live-1** owns the low-latency, full-duplex spoken conversation.
- **GPT-5.6 Luna / High** is the default delegated reasoning model.
- **Terra / High** handles specialist work when the task is meaningfully harder.
- **Sol / High or Extra High** is reserved for high-complexity debugging, architecture, and security tasks.
- **17 specialist agents** provide role-specific prompts and routing.
- Existing B.R.A.C.E permission gates remain authoritative for files, commands, apps, Git, browser automation, and other local actions.

## Voice flow

1. The renderer gets the microphone only after the B.R.A.C.E microphone permission has been enabled.
2. Electron sends the browser WebRTC SDP offer to the trusted backend.
3. The backend creates a `gpt-live-1` session with client delegation. The OpenAI key never enters renderer code.
4. GPT-Live talks directly to the user and supports interruption.
5. When GPT-Live delegates work, the renderer keeps transcript context and forwards the current task to the backend.
6. The model router picks an agent and model tier.
7. The delegated result returns to GPT-Live with `session.commentary.append`, which lets GPT-Live say it naturally.

## Model policy

The default is intentionally economical and fast:

- Simple / normal delegated task -> Luna, high reasoning.
- Moderately complex specialist task -> Terra, high reasoning.
- Deep architecture, security, stubborn debugging, or very high complexity -> Sol, high or xhigh.
- Pro reasoning mode is only used for the highest complexity score.

The router is deterministic and inspectable in `backend/agents/modelRouter.cjs`.

## Startup

Production Electron starts a tiny HTTP server bound only to `127.0.0.1`. It serves the already-built Vite assets, so startup does not wait for a Vite development server or rebuild.

On Kubuntu, run once:

```bash
cd brace-interface
chmod +x scripts/install-kubuntu-autostart.sh
./scripts/install-kubuntu-autostart.sh
```

After that, KDE launches B.R.A.C.E at login.

## First-run setup

For the simplest Kubuntu install:

```bash
cd brace-interface
chmod +x scripts/setup-jarvis.sh
./scripts/setup-jarvis.sh
```

Add `--skills` only if you also want the optional pinned third-party Codex skill library:

```bash
./scripts/setup-jarvis.sh --skills
```

Then:

1. Run `npm run launch` once.
2. Save an OpenAI API key in Settings.
3. Enable Microphone and AI model permissions.
4. Keep GPT-Live-1 / Online High Quality voice enabled.
5. Once microphone permission and a saved OpenAI key exist, B.R.A.C.E auto-connects a Live session shortly after startup.
6. Idle Live sessions close automatically after 90 seconds without activity to avoid paying for silence all day.
7. Keep high-risk permissions off until needed.

The optional skill bootstrap is pinned to a reviewed `my-codex` commit rather than floating `main`.

## Performance choices

The orb uses a Canvas particle sphere instead of a heavy WebGL scene. Device pixel ratio is capped and the particle count is bounded. This keeps the visual alive without dedicating a large part of the GPU to decoration.

The localhost server caches fingerprinted assets aggressively while leaving `index.html` uncached. No rebuild happens on normal launch.
