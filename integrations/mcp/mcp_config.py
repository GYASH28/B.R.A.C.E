from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from services.settings_service import MCP_PATH, read_json, write_json


@dataclass
class McpValidation:
    ok: bool
    message: str


class McpConfig:
    def __init__(self, path=MCP_PATH):
        self.path = path

    def load(self) -> dict[str, Any]:
        return read_json(self.path, {"mcpServers": {}})

    def save(self, data: dict[str, Any]) -> None:
        write_json(self.path, data)

    def validate(self) -> McpValidation:
        data = self.load()
        servers = data.get("mcpServers")
        if not isinstance(servers, dict):
            return McpValidation(False, "Config must contain an mcpServers object.")
        for name, server in servers.items():
            if not isinstance(server, dict):
                return McpValidation(False, f"{name}: server config must be an object.")
            if not server.get("command"):
                return McpValidation(False, f"{name}: command is required.")
            args = server.get("args", [])
            if args and not isinstance(args, list):
                return McpValidation(False, f"{name}: args must be a list.")
            env = server.get("env", {})
            if env and not isinstance(env, dict):
                return McpValidation(False, f"{name}: env must be an object.")
        return McpValidation(True, f"{len(servers)} MCP server(s) configured.")

    def add_or_update(self, name: str, server: dict[str, Any]) -> None:
        data = self.load()
        data.setdefault("mcpServers", {})[name] = server
        self.save(data)

