# Troubleshooting Guide

This guide covers common issues when setting up B.R.A.C.E with Voicebox and GitNexus on Windows.

## Voicebox Issues

### 1. Voicebox Connection Refused / Voicebox Offline
**Symptom:** Voicebox UI says offline, or backend logs show `ECONNREFUSED`.
**Cause:** The Voicebox application is not running, or it's running on a different port.
**Solution:** 
1. Open the Voicebox desktop app. It must be running in the background.
2. Verify it is listening on port `17493` by running `npm run brace:voicebox:check`.
3. If it's on a different port, update the `.env` file: `VOICEBOX_BASE_URL=http://127.0.0.1:YOUR_PORT`.

### 2. Audio Playback Issues / Robotic Voice
**Symptom:** The AI voice sounds robotic, metallic, or uses the default OS voice instead of high-quality Voicebox.
**Cause:** B.R.A.C.E has fallen back to the browser's built-in Web Speech API because Voicebox is unreachable.
**Solution:**
1. Ensure Voicebox is running.
2. Ensure you have downloaded at least one voice model in the Voicebox UI.
3. Check `.env` to ensure `VOICE_PROVIDER=voicebox` is set.

## GitNexus Issues

### 3. GitNexus analyze fails or warns about C++ build tools
**Symptom:** When running `npm run brace:index`, you see errors about `node-gyp` or missing C++ build tools (Visual Studio Build Tools).
**Cause:** GitNexus uses Tree-sitter, which requires compiling C++ grammars for some niche languages.
**Solution:** 
You can safely ignore these warnings. We have configured the scripts to use `$env:GITNEXUS_SKIP_OPTIONAL_GRAMMARS=1`, which bypasses the compilation of optional grammars. GitNexus will use pre-built binaries for major languages (JS, TS, Python, etc.) and JS-based fallbacks where necessary.

### 4. GitNexus MCP not detected in Cursor
**Symptom:** Cursor says "MCP server disconnected" or tools are missing.
**Cause:** Node.js or npx is not in your system PATH, or Cursor needs a restart.
**Solution:**
1. Ensure you have installed GitNexus globally (`npm install -g gitnexus`).
2. Restart Cursor.
3. In Cursor settings > MCP, verify the GitNexus server is using `npx.cmd` (required for Windows).

## System Issues

### 5. Port 17493 or 17500 already in use
**Symptom:** Errors starting B.R.A.C.E backend (`EADDRINUSE`) or starting Voicebox.
**Cause:** Another application or a stale node process is holding the port.
**Solution:**
1. Open PowerShell as Administrator.
2. Find the PID: `netstat -ano | findstr :17500`
3. Kill it: `Stop-Process -Id <PID> -Force`
