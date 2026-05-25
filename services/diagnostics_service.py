from __future__ import annotations

import importlib
import platform
import shutil
import socket
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from services.path_utils import app_path
from services.settings_service import env, env_bool
from services.legacy_speech_service import LegacySpeechService
from config import get_music_dir


@dataclass
class CheckResult:
    name: str
    status: str
    detail: str


def _cmd_version(command: list[str], timeout: int = 5) -> str:
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=timeout)
        text = (result.stdout or result.stderr).strip().splitlines()
        return text[0] if text else ("available" if result.returncode == 0 else "not responding")
    except FileNotFoundError:
        return "not found"
    except Exception as exc:
        return f"error: {exc}"


class DiagnosticsService:
    def run_full(self, emit: Callable[[CheckResult], None] | None = None) -> list[CheckResult]:
        checks = [
            self.python_version(),
            self.os_info(),
            self.module("PyQt6"),
            self.module("pyttsx3"),
            self.module("speech_recognition"),
            self.module("wikipedia"),
            self.module("pyjokes"),
            self.legacy_speech(),
            self.node_version(),
            self.npm_version(),
            self.npx_version(),
            self.openclaw_version(),
            self.mcp_config(),
            self.env_key("GEMINI_API_KEY", "Gemini key"),
            self.env_key("NVIDIA_API_KEY", "NVIDIA key"),
            self.internet(),
            self.microphone(),
            self.folder("logs"),
            self.folder("outputs"),
            self.folder("outputs/images"),
            self.folder("outputs/notes"),
            self.music_folder(),
            self.folder("memory"),
            self.pyinstaller(),
        ]
        if emit:
            for check in checks:
                emit(check)
        return checks

    def python_version(self) -> CheckResult:
        return CheckResult("Python", "ok", sys.version.split()[0])

    def os_info(self) -> CheckResult:
        return CheckResult("OS", "ok", f"{platform.system()} {platform.release()}")

    def module(self, name: str) -> CheckResult:
        try:
            importlib.import_module(name)
            return CheckResult(name, "ok", "installed")
        except Exception as exc:
            return CheckResult(name, "warn", f"missing or failed import: {exc}")

    def node_version(self) -> CheckResult:
        detail = _cmd_version(["node", "--version"])
        return CheckResult("Node.js", "ok" if detail != "not found" else "warn", detail)

    def npm_version(self) -> CheckResult:
        detail = _cmd_version(["npm", "--version"])
        return CheckResult("npm", "ok" if detail != "not found" else "warn", detail)

    def npx_version(self) -> CheckResult:
        detail = _cmd_version(["npx", "--version"])
        return CheckResult("npx", "ok" if detail != "not found" else "warn", detail)

    def openclaw_version(self) -> CheckResult:
        detail = _cmd_version(["openclaw", "--version"])
        return CheckResult("OpenClaw", "ok" if detail != "not found" else "warn", detail)

    def mcp_config(self) -> CheckResult:
        path = app_path("config", "mcp_servers.json")
        if not path.exists():
            return CheckResult("MCP config", "warn", "missing config/mcp_servers.json")
        try:
            import json
            data = json.loads(path.read_text(encoding="utf-8"))
            valid = isinstance(data.get("mcpServers"), dict)
            return CheckResult("MCP config", "ok" if valid else "warn", "valid" if valid else "missing mcpServers object")
        except Exception as exc:
            return CheckResult("MCP config", "error", str(exc))

    def env_key(self, key: str, label: str) -> CheckResult:
        value = env(key)
        placeholder = any(x in value.lower() for x in ("your_", "paste_", "placeholder"))
        status = "ok" if value and not placeholder else "warn"
        return CheckResult(label, status, "configured" if status == "ok" else "not configured")

    def internet(self) -> CheckResult:
        try:
            socket.create_connection(("8.8.8.8", 53), timeout=3).close()
            return CheckResult("Internet", "ok", "reachable")
        except Exception as exc:
            return CheckResult("Internet", "warn", f"unreachable: {exc}")

    def microphone(self) -> CheckResult:
        if not env_bool("BRACE_VOICE_ENABLED", True):
            return CheckResult("Microphone", "warn", "voice disabled")
        try:
            import sounddevice as sd
            devices = sd.query_devices()
            inputs = [d for d in devices if d.get("max_input_channels", 0) > 0]
            return CheckResult("Microphone", "ok" if inputs else "warn", f"{len(inputs)} input device(s)")
        except Exception as exc:
            return CheckResult("Microphone", "warn", str(exc))

    def legacy_speech(self) -> CheckResult:
        status = LegacySpeechService().status()
        level = "ok" if status.tts_available and status.stt_available else "warn"
        return CheckResult("Legacy speech", level, status.detail)

    def music_folder(self) -> CheckResult:
        path = Path(get_music_dir()).expanduser()
        if path.exists() and path.is_dir():
            return CheckResult("Music folder", "ok", str(path))
        return CheckResult("Music folder", "warn", f"not found: {path}")

    def folder(self, relative: str) -> CheckResult:
        path = app_path(*relative.split("/"))
        try:
            path.mkdir(parents=True, exist_ok=True)
            return CheckResult(relative, "ok", str(path))
        except Exception as exc:
            return CheckResult(relative, "error", str(exc))

    def pyinstaller(self) -> CheckResult:
        found = shutil.which("pyinstaller")
        if found:
            return CheckResult("PyInstaller", "ok", found)
        try:
            import PyInstaller  # noqa: F401
            return CheckResult("PyInstaller", "ok", "module installed")
        except Exception:
            return CheckResult("PyInstaller", "warn", "not installed")

    @staticmethod
    def format_report(results: list[CheckResult]) -> str:
        return "\n".join(f"{r.status.upper():5} {r.name}: {r.detail}" for r in results)
