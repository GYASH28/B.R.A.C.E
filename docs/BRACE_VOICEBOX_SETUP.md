# Voicebox Integration Guide

This guide details how B.R.A.C.E integrates with Voicebox for local voice capabilities.

## What is Voicebox?
Voicebox is a high-quality, local voice studio that provides Text-to-Speech (TTS), Speech-to-Text (STT), and voice cloning capabilities. It runs locally and exposes a REST API on port `17493`. 

In B.R.A.C.E, Voicebox serves as the primary provider for the `voiceboxProvider.cjs` and `voiceboxSTTProvider.cjs` modules, bringing ultra-realistic AI voices (like Qwen3-TTS and Kokoro) into the agent's voice chat.

## Installation on Windows

For Windows users, we highly recommend using the **pre-built installer** rather than building from source.

1. Go to [voicebox.sh](https://voicebox.sh) or [GitHub Releases](https://github.com/jamiepine/voicebox/releases).
2. Download the Windows installer (`.exe` or `.msi`).
3. Run the installer to install the application.

*Why not source?* Building from source on Windows requires installing Rust, Cargo, Bun, and the `just` command runner, which can be a complex process. The installer provides a one-click setup.

## Starting Voicebox

1. Launch the Voicebox application from your Start Menu or Desktop.
2. The application must remain open for B.R.A.C.E to connect to it.
3. Once open, it automatically hosts the REST API at `http://127.0.0.1:17493`.

To verify it is running from within B.R.A.C.E:
```powershell
npm run brace:voicebox:check
```

## How B.R.A.C.E Connects to Voicebox

The integration is managed by the backend Node.js server:
1. `backend/voice/voiceConfig.cjs` reads the `.env` file to check if Voicebox is enabled (`VOICE_PROVIDER=voicebox`).
2. `backend/voice/voiceStatus.cjs` performs a TCP probe on port `17493` to see if Voicebox is alive.
3. `backend/voice/voiceboxProvider.cjs` handles POST requests to `/speak` and `/generate`.
4. `backend/voice/voiceboxSTTProvider.cjs` handles POST requests to `/transcribe`.

## Available Voice Engines

Through Voicebox, B.R.A.C.E gains access to:
- **Qwen3-TTS**: High-quality local TTS
- **Chatterbox**: Fast conversational voices
- **Kokoro**: Efficient, emotive TTS
- **LuxTTS / HumeAI TADA**: Advanced engines
- **Whisper**: Industry-standard Speech-to-Text for transcription

## Configuration (.env)

The following environment variables configure the Voicebox connection:
```env
VOICE_PROVIDER=voicebox
VOICEBOX_BASE_URL=http://127.0.0.1:17493
VOICEBOX_DEFAULT_PROFILE=
```
To use a specific voice profile, set `VOICEBOX_DEFAULT_PROFILE` to the Profile ID found in the Voicebox app.

## Testing Features Manually

To run the automated tests against a running Voicebox instance:
```powershell
npm run brace:test
```

To manually trigger a voice response in the UI:
1. Ensure Voicebox is running.
2. Ensure the B.R.A.C.E frontend is running (`npm run dev`).
3. Click the microphone icon or type a command like "brace, speak this Hello World".
