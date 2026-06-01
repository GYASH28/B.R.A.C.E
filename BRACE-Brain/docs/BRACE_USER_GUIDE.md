# B.R.A.C.E User Guide

## Run The App
```powershell
cd "C:\Users\Admin\Documents\BRACE-Brain\brace-interface"
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

For desktop:
```powershell
npm run desktop
```

## Configure AI
Open Settings:
- Choose Ollama, Gemini, OpenAI-compatible, OpenRouter-compatible, LM Studio, or custom endpoint.
- Enter model name, base URL, optional API key, temperature, and max tokens.
- Use Test connection before relying on cloud or local model calls.

## Local Ollama
Install and run Ollama, then set:
- Provider: Ollama
- Endpoint: `http://127.0.0.1:11434`
- Model: installed model name, for example `llama3.2`

## Permissions
Open Access and enable only what you need:
- AI model access for model calls.
- File read/write for documents.
- Folder organization for Downloads cleanup.
- Terminal commands for command execution.
- App launching for VS Code, browser, folders, and URLs.
- Coding agent edits for project modifications.
- Memory read/write for remembered information.

## Agent Commands
Use Chat for commands like:
- `Search my PC for my Lernio project`
- `Organize my Downloads folder`
- `Remember my portfolio project path`
- `Fix this error in my project`
- `Plan my day`

Medium and high-risk commands show approval cards before tools execute.

## Memory And Notes
- Memory is stored locally in `_BRACE_DATA/memory`.
- Notes are stored locally in `_BRACE_DATA/notes`.
- Secrets are redacted before memory/log storage.

## Troubleshooting
- AI provider missing: check Settings and Test connection.
- Permission denied: enable the exact permission shown in the error.
- File/folder blocked: select the file/folder explicitly or add a safe folder.
- Command blocked: edit the command to remove destructive, admin, persistence, or download-execute behavior.
