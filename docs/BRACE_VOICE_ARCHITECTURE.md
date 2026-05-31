# B.R.A.C.E Voice Architecture

## Backend
`backend/voice` contains:
- `voiceService.cjs`: config, status, provider detection, logging.
- `voiceStatus.cjs`: truthful dependency checks and fallback selection.
- `voiceConfig.cjs`: defaults and presets.
- `vadManager.cjs`: VAD timing configuration.
- provider files for Kokoro, Piper, Whisper, and edge-tts setup metadata.

Electron IPC:
- `voice:status`
- `voice:config:get`
- `voice:config:update`
- `voice:voices`
- `voice:log`

## Frontend
`src/voice` contains:
- `VoiceOrb.tsx`: reusable stateful orb.
- `VoiceControls.tsx`: command input, mic, attach, send, mode selector.
- `VoiceSettings.tsx`: full voice configuration surface.
- `useAudioRecorder.ts`: mic stream, analyser, silence detection, Web Speech fallback.
- `useAudioPlayer.ts`: TTS queue, sentence chunking, interruption.
- `useVoiceAgent.ts`: STT -> agent -> TTS orchestration.
- `voiceStateStore.ts`: defaults and state labels.

## States
- idle
- listening
- thinking
- speaking
- muted
- error
- offline

## Privacy Rules
- Mic is started only after visible user action.
- Mic state is visible.
- Raw audio is not saved.
- Online voice is disabled unless explicitly enabled.
- Risky agent actions still require on-screen approval.

## Streaming Roadmap
The current implementation is reliable non-streaming with sentence-chunked TTS. The architecture can add:
- partial transcript streaming from local STT
- LLM token streaming
- phrase-level TTS streaming
- local Kokoro/Piper audio endpoint generation
