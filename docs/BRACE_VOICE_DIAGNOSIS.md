# B.R.A.C.E Voice Diagnosis

## Current Stack
- Frontend: React 19, TypeScript, Vite, Tailwind v4, Framer Motion.
- Desktop/backend: Electron main process with CommonJS backend modules.
- Voice before rebuild: browser `SpeechRecognition` / `webkitSpeechRecognition` for STT and browser `speechSynthesis` for TTS.

## What Was Broken Or Low Quality
- No local STT provider architecture existed.
- No Kokoro, Piper, faster-whisper, whisper.cpp, Silero VAD, or edge-tts integration path existed.
- TTS used browser voices only, which can sound robotic depending on installed Windows voices.
- No audio queue existed, so old speech could overlap or continue after a new command.
- No real barge-in/interruption behavior existed.
- No mic amplitude analysis or silence detection existed beyond browser recognition.
- Voice state was just `listening` true/false, not idle/listening/thinking/speaking/muted/error/offline.
- Home page was dashboard-heavy and did not focus on a premium assistant orb.

## Selected Architecture
- Keep the Electron embedded backend.
- Add backend voice modules that detect Kokoro, Piper, faster-whisper, whisper.cpp, Silero VAD, and edge-tts truthfully.
- Add a reliable browser fallback voice pipeline in React using Web Speech, Web Audio analyser, silence detection, and speech queue cancellation.
- Use Kokoro/faster-whisper/Silero as the preferred local stack when installed.
- Use Piper as fast local fallback when installed.
- Use edge-tts only when online voice mode is explicitly enabled.

## Files Changed
- `backend/voice/*`
- `src/voice/*`
- `src/App.tsx`
- `src/index.css`
- `electron/main.cjs`
- `electron/preload.cjs`
- `src/types.ts`
- `src/vite-env.d.ts`
- `requirements-voice.txt`

## Dependencies Needed
- Optional Python packages are listed in `requirements-voice.txt`.
- Browser fallback needs no extra dependency.
- Kokoro/Piper/Whisper are not faked. If missing, the app reports setup commands and uses fallback.

## Final Voice Pipeline
Push-to-talk/click:
`mic -> Web Audio VAD/silence detection -> STT provider/fallback transcript -> B.R.A.C.E agent runtime -> response -> TTS queue -> audio playback -> logs`

If the user speaks while B.R.A.C.E is speaking:
`barge-in -> cancel current speech queue -> switch orb to listening -> process new command`

## Test Plan
- Open home page and confirm orb idle state.
- Click orb/mic and confirm mic permission prompt.
- Speak a short command and verify transcript appears.
- Confirm agent receives transcript.
- Confirm response is spoken.
- Click while speaking and verify speech stops.
- Open Voice page and test preview, speed, pitch, volume, VAD sensitivity, and provider status.
- Confirm missing Kokoro/Piper/Whisper show setup guidance instead of crashing.
