# GitNexus Integration Guide

This guide explains how B.R.A.C.E utilizes GitNexus to understand its own codebase.

## What is GitNexus?

GitNexus is a Zero-Server Code Intelligence Engine. It works by:
1. Parsing the codebase using **Tree-sitter** to understand the Abstract Syntax Tree (AST).
2. Building a graph database using **KuzuDB** to track dependencies, function calls, and data flow.
3. Exposing this graph to AI agents via the **Model Context Protocol (MCP)**.

By integrating GitNexus, B.R.A.C.E agents gain deep architectural understanding of the project, moving beyond simple grep/text search.

## Installation

GitNexus should be installed globally on your machine:
```powershell
npm install -g gitnexus
```

*Windows Note: If you lack C++ build tools, npm might show errors when compiling optional grammars. GitNexus handles this gracefully and will still work.*

## Running Analysis

Before GitNexus can answer questions, it must index the codebase. This is done from the root of the project:

```powershell
# Using the npm script:
npm run brace:index

# Or directly:
npx gitnexus analyze
```

This command parses the code and generates the graph in a hidden `.gitnexus/` folder.
Whenever you make significant architectural changes, run `npx gitnexus analyze --force` to rebuild the index.

## What GitNexus Generates

When you run `analyze`, GitNexus creates:
- `.gitnexus/` — The internal KuzuDB graph data.
- `AGENTS.md` — A summary of the project architecture for AI consumption.
- `CLAUDE.md` — Agent instructions (if enabled).

## IDE / Agent Configuration (MCP)

GitNexus provides tools to IDEs like Cursor, Claude Code, and Windsurf via MCP. The available tools are:
- `impact`: Analyze the blast radius of changing a specific function/symbol.
- `query`: Run a natural language query against the codebase graph.
- `context`: Get the context of a specific file or symbol.
- `detect_changes`: See what has changed and the impact.
- `rename`: Safely rename a symbol across the project.

### Cursor Configuration
We have already created `.cursor/mcp.json` for you:
```json
{
  "mcpServers": {
    "gitnexus": {
      "command": "npx.cmd",
      "args": ["-y", "gitnexus@latest", "mcp"],
      "cwd": "."
    }
  }
}
```
*Note: On Windows, we use `npx.cmd`.*

### Claude Code
Run the following in the terminal to add the MCP server to Claude Code:
```powershell
claude mcp add gitnexus -- cmd /c npx -y gitnexus@latest mcp
```

### Windsurf
Edit `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "gitnexus": {
      "command": "npx.cmd",
      "args": ["-y", "gitnexus@latest", "mcp"],
      "cwd": "C:\\Users\\Admin\\Documents\\BRACE-Brain\\brace-interface"
    }
  }
}
```
