# B.R.A.C.E. Practical Fix Audit Report

This document details the audit of the B.R.A.C.E local assistant repository, comparing the visual features shown in the user interface to the backend reality, identifying gimmicks, and outlining the priority fixes.

---

## 1. What Actually Works

*   **Local Note Manager**: Creating, reading, listing, and deleting (moving to recycle bin) notes in Markdown format inside the Obsidian vault works perfectly.
*   **Local Memory Manager**: Saving, searching, updating, and deleting local vector/json memories works.
*   **File Analysis**: Extracting text from `.pdf`, `.docx`, and text files (`.txt`, `.md`, etc.) and summarizing or searching them using the local tools.
*   **Project Scanner**: Reading `package.json` scripts, `.git` repository status, and listing source files up to 120 entries.
*   **App Launching**: Opening VS Code via `vscode://` URL handler, opening URLs via external browser, opening local folder paths, and launching specific app executables.
*   **Telemetry Readings**: The CPU and RAM readings are populated with real system data when the `systemInfo` permission is enabled.
*   **Safety Approvals**: The backend safety classifier, plan planner, and approval cards for chat-triggered actions work end-to-end.
*   **GitNexus CLI integration**: The backend can run status check, index, and re-index commands via `execFile` using `npx gitnexus`.

---

## 2. What is Only UI (Front-end only)

*   **Microphone/Voice Input Integration**: The microphone button triggers the browser's built-in `SpeechRecognition` API directly in the frontend, bypassing the backend and Voicebox entirely.
*   **Scheduled Tasks (Automation Page)**: The initial tasks list displayed on the automation page is hardcoded in `src/data/appData.ts`.
*   **Workspace Recent Files (Home Page)**: The files shown under the "Recent Files" list are static mock items.
*   **Voice Playback**: Speaking assistant responses is handled entirely in the browser using `window.speechSynthesis`.
*   **Voice Orb States**: The orb states (`thinking`, `speaking`) are controlled by mock timers rather than real audio-stream completion hooks.

---

## 3. What is Only Backend (No connection to UI)

*   **Voicebox Client & STT Integration**: The backend has `voiceboxSTTProvider.cjs` and `voiceboxProvider.cjs` configured for local Whisper transcription and TTS generation, but no Electron IPC handler connects them to the frontend.
*   **GitNexus MCP tools**: Tools like `gitnexus.analyze` exist in the registry, but the UI has no panels or buttons to interact with GitNexus documentation, config mapping, or MCP server registers.

---

## 4. What is Fake / Gimmick

*   **Browser Automation**: `browserTools.cjs` returns a hardcoded status stating it is present but not enabled. There is no actual browser automation action.
*   **System Telemetry Graphs**: The historical curves in the system monitor cards use hardcoded numerical arrays (`graph: [24, 31, 28, 44...]`) instead of recording actual time-series telemetry.
*   **Wake Word Setting**: Toggles a settings checkbox but has no underlying speech-listening daemon or wake word detector wired.
*   **OpenClaw / Nano Banana Status**: Mentioned in backend logs and setup status text, but no real status detection is implemented.

---

## 5. What is Duplicated

*   **Voice Configuration**: The active voice configuration is stored in the local settings store but also hardcoded as `defaultVoiceConfig` in the frontend state stores.
*   **Task Runners**: The system uses `runTask` for legacy PyQt automation and `executor` for agent steps, creating redundant execution paths.

---

## 6. What is Broken / Incomplete

*   **Voicebox Connection**: The health check fails to connect because the URL and ports are not exposed or configurable properly in the client state.
*   **Line Endings / Staging**: Line ending CRLF mismatches prevent files like `README.md` from staging cleanly on Windows (resolved by renormalization).

---

## 7. What is Risky

*   **Unapproved App Launching**: App launcher doesn't validate app paths if the user selects a malicious batch/cmd file.
*   **File Write Permissions**: The AI planner can attempt to write to system directories if `pathGuard` is bypassed.

---

## 8. What Should be Removed or Hidden

*   **Fake Telemetry Graphs**: Remove the hardcoded historical graphs from `SystemMetricCard` or simplify them to only show the current live value.
*   **Wake Word Switch**: Hide it from the settings page since wake-word monitoring is not implemented.
*   **Fake Browser Automation**: Remove or label the "Create Automation" chip as "Coming Soon" unless wired.

---

## 9. What Should be Repaired First

*   **Voicebox end-to-end flow**: Connect audio recording in the frontend to backend Voicebox STT, and voice synthesis to Voicebox TTS, with fallback to browser when offline.
*   **System Intelligence Panel**: Connect GitNexus status, indexing, and code mapping directly to the frontend `Projects` or a new `System Intelligence` page.
*   **Clean Home Dashboard**: Redesign the home layout to focus on the active voice core and working features.

---

## 10. Exact Files Needing Changes

*   **Backend**:
    *   `brace-interface/backend/index.cjs` (Add Voicebox and GitNexus IPC handlers)
    *   `brace-interface/backend/voice/voiceService.cjs` (Implement real speak/transcribe routing)
    *   `brace-interface/backend/voice/voiceStatus.cjs` (Expose accurate provider selection)
*   **Electron**:
    *   `brace-interface/electron/main.cjs` (Register new IPC channels)
    *   `brace-interface/electron/preload.cjs` (Expose handlers to frontend window)
*   **Frontend**:
    *   `brace-interface/src/App.tsx` (Hook up real actions, settings, and redesign dashboard)
    *   `brace-interface/src/components/Interface.tsx` (Clean up layouts and remove fake statuses)
    *   `brace-interface/src/voice/useVoiceAgent.ts` (Implement Audio recording and Voicebox transcription call)
    *   `brace-interface/src/voice/useAudioPlayer.ts` (Play Voicebox audio array buffer response)
    *   `brace-interface/src/voice/useAudioRecorder.ts` (Record audio bloblets via MediaRecorder API)

---

## 11. Priority Roadmap (P0 - P3)

### P0: Core Voicebox Integration & Audio Flow
- Create frontend audio recorder (`MediaRecorder` WAV wrapper).
- Pass raw audio array buffer to backend IPC.
- Wire backend IPC `voicebox:transcribe` to Voicebox STT.
- Wire backend IPC `voicebox:speak` to Voicebox TTS.
- Play generated wav buffer in frontend using standard HTML5 Audio.
- Implement automatic fallback to Web Speech APIs (browser) if Voicebox is unreachable.

### P1: System Intelligence & GitNexus
- Implement frontend panel for GitNexus status, re-indexing, and docs.
- Expose IPC routes: `gitnexus:status`, `gitnexus:index`, `gitnexus:docs`, `gitnexus:openDoc`.
- Ensure GitNexus generated code-maps and guides are visible and editable.

### P2: UI Cleanup & Gimmick Purge
- Redesign the Dashboard around the central living orb.
- Remove fake telemetry graphs and hardcoded system-status lock statuses.
- Expose real connection states ("Unavailable", "Offline", "Connected").
- Wire VS Code and project scanning properly.

### P3: Settings, Memory, and Verification
- Wire all sliders (speed, pitch, volume) to actually impact Voicebox/browser TTS.
- Add manual test checklist (`docs/BRACE_MANUAL_TEST_CHECKLIST.md`).
- Ensure `npm run build` and `npm run desktop` compile perfectly without TypeScript/preload errors.
