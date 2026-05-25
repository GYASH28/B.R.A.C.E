from __future__ import annotations

import os
import subprocess
from dataclasses import dataclass


@dataclass
class McpProcess:
    name: str
    process: subprocess.Popen | None = None

    def start(self, command: str, args: list[str], env: dict[str, str] | None = None) -> str:
        if self.process and self.process.poll() is None:
            return f"{self.name} is already running."
        resolved_env = os.environ.copy()
        for key, value in (env or {}).items():
            if value.startswith("${") and value.endswith("}"):
                value = os.environ.get(value[2:-1], "")
            resolved_env[key] = value
        try:
            self.process = subprocess.Popen(
                [command] + [self._resolve_arg(a) for a in args],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env=resolved_env,
            )
        except FileNotFoundError:
            return f"{self.name} MCP server command not found: {command}"
        except OSError as e:
            return f"{self.name} MCP server failed to start: {e}"
        return f"{self.name} MCP server starting."

    def stop(self) -> str:
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
            return f"{self.name} MCP server stop requested."
        return f"{self.name} is not running."

    @staticmethod
    def _resolve_arg(value: str) -> str:
        if value.startswith("${") and value.endswith("}"):
            return os.environ.get(value[2:-1], "")
        return value

