from __future__ import annotations

from integrations.mcp.mcp_config import McpConfig, McpValidation
from integrations.mcp.mcp_process import McpProcess
from services.logging_service import BraceLog


class McpManager:
    def __init__(self):
        self.config = McpConfig()
        self.processes: dict[str, McpProcess] = {}

    def list_servers(self) -> dict:
        return self.config.load().get("mcpServers", {})

    def validate(self) -> McpValidation:
        result = self.config.validate()
        BraceLog.info("mcp", result.message)
        return result

    def start(self, name: str) -> str:
        servers = self.list_servers()
        server = servers.get(name)
        if not server:
            return f"MCP server not found: {name}"
        process = self.processes.setdefault(name, McpProcess(name))
        result = process.start(server["command"], server.get("args", []), server.get("env", {}))
        BraceLog.info("mcp", result)
        return result

    def stop(self, name: str) -> str:
        process = self.processes.get(name)
        result = process.stop() if process else f"{name} is not running."
        BraceLog.info("mcp", result)
        return result

    def ensure_nano_banana_default(self, package: str = "nano-banana-mcp") -> None:
        self.config.add_or_update(
            "nano-banana",
            {
                "enabled": False,
                "command": "npx",
                "args": ["-y", package],
                "env": {"GEMINI_API_KEY": "${GEMINI_API_KEY}"},
            },
        )

