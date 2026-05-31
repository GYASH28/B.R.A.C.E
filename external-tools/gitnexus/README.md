# GitNexus — External Tool Reference

GitNexus is installed **globally via npm**, not as a local clone.

## Install
```powershell
npm install -g gitnexus
```

## Usage
```powershell
cd C:\Users\Admin\Documents\BRACE-Brain\brace-interface
npx gitnexus analyze
npx gitnexus status
npx gitnexus mcp
```

## What It Does
GitNexus is a Zero-Server Code Intelligence Engine that builds a **knowledge graph** of
the B.R.A.C.E codebase using Tree-sitter AST parsing and KuzuDB. It exposes this graph
to AI agents via the Model Context Protocol (MCP).

## Learn More
- GitHub: https://github.com/abhigyanpatwari/GitNexus
- Docs: See `docs/BRACE_GITNEXUS_SETUP.md`
