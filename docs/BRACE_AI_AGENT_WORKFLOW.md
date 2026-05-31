# AI Agent Workflow in B.R.A.C.E

This document describes how AI agents (both the internal B.R.A.C.E agents and external coding assistants like Cursor/Claude) should interact with the project.

## The Agent Loop

Agents working on the B.R.A.C.E codebase should follow this workflow to ensure high-quality architectural decisions:

1. **Check Status**: Agents should check if Voicebox and GitNexus are running and healthy.
2. **Consult GitNexus (Index & Query)**: Before making significant architectural changes, agents must use the GitNexus MCP tools to query the codebase graph. If the index is stale, run `npx gitnexus analyze --force`.
3. **Execute**: Make the necessary code modifications using file edit tools.
4. **Re-index**: After significant edits, the agent should re-index the project (`npx gitnexus analyze --force`) so future queries have updated context.
5. **Report**: Summarize the changes using the voice system or UI.

## The Voice Interface

When interacting through the B.R.A.C.E UI, users can trigger commands that the Command Router (`commandRouter.cjs`) interprets.

Example commands:
- `"brace, index this codebase"` → Triggers `gitnexusTools.analyzeProject()`
- `"brace, check voicebox status"` → Triggers `voiceboxProvider.healthCheck()`
- `"brace, speak this [text]"` → Triggers `voiceboxProvider.speak()`

## Internal Agent Architecture

- **Tool Registry (`backend/tools/toolRegistry.cjs`)**: This is where all agent capabilities are registered. GitNexus analysis and Voicebox interactions are exposed as tools here.
- **Voice Providers (`backend/voice/`)**: Abstracts away the complexity of TTS/STT. The system automatically prioritizes Voicebox when it is available, falling back to Kokoro, Piper, or browser speech synthesis if offline.

## GitNexus MCP Usage

External IDEs (Cursor, Windsurf) connect to GitNexus via MCP. 
When prompting an AI in Cursor, use phrases like:
- *"Use GitNexus to map out the dependencies of the VoiceOrb component."*
- *"Run a GitNexus impact analysis on changing the getVoiceStatus function."*
- *"Query GitNexus to find all files related to audio playback."*
