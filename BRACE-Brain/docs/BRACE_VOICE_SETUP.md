# B.R.A.C.E Voice Setup

## Browser Fallback
Browser Fallback works without extra setup:
- STT: Chromium/Web Speech API when available.
- TTS: Browser/Windows speech voices.
- VAD: Web Audio mic level and silence detection.

This is reliable, but quality depends on installed system voices.

## Python Local Voice Setup
Recommended Python: 3.10 or 3.11 on Windows.

Create or activate a virtual environment from the vault root:

```powershell
cd "C:\Users\Admin\Documents\BRACE-Brain"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-voice.txt
```

## Best Local Mode
Best Local Mode expects:
- `faster-whisper`
- `kokoro`
- `silero-vad` or `onnxruntime`

Install:

```powershell
python -m pip install faster-whisper kokoro soundfile silero-vad onnxruntime
```

## Fast Local Mode
Fast Local Mode expects:
- faster-whisper or whisper.cpp
- Piper TTS

Piper setup varies by release. Install Piper, download a voice model, then configure the model path in voice settings when model-path support is enabled.

## Online High Quality Mode
Online mode is disabled by default. Enable it only if you accept online TTS requests.

```powershell
python -m pip install edge-tts
```

## Common Fixes
- Mic denied: enable microphone permission in Windows and in B.R.A.C.E Access.
- No transcript: switch to Browser Fallback or install faster-whisper.
- Robotic voice: install Kokoro/Piper or choose a better Windows voice from the dropdown.
- Playback blocked: click the orb once before using preview or TTS.
- CPU too slow: use Fast Local or Browser Fallback mode.
