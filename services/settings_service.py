from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

try:
    from dotenv import load_dotenv
except Exception:
    def load_dotenv(path):  # type: ignore
        if not path.exists():
            return False
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
        return True

from services.path_utils import app_path


ENV_PATH = app_path(".env")
SETTINGS_PATH = app_path("config", "app_settings.json")
PROVIDERS_PATH = app_path("config", "providers.json")
MCP_PATH = app_path("config", "mcp_servers.json")

load_dotenv(ENV_PATH)


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def env_bool(name: str, default: bool = False) -> bool:
    raw = env(name, "true" if default else "false").lower()
    return raw not in {"0", "false", "no", "off", ""}


def env_int(name: str, default: int = 0) -> int:
    try:
        return int(env(name, str(default)))
    except ValueError:
        return default


def read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


class SettingsService:
    defaults = {
        "theme": "Neon dark",
        "accent_color": "#00d9ff",
        "animation_level": "Balanced",
        "boot_animation": True,
        "default_provider": "gemini",
        "default_model": "gemini-2.5-flash",
        "response_mode": "Balanced",
        "safe_mode": True,
        "memory_enabled": True,
        "log_level": "INFO",
        "startup_page": "Dashboard",
        "assistant_name": "B.R.A.C.E.",
        "music_dir": str(Path.home() / "Music"),
        "notes_dir": str(app_path("outputs", "notes")),
        "legacy_voice_enabled": False,
        "legacy_stt_enabled": False,
    }

    def __init__(self, path: Path = SETTINGS_PATH):
        self.path = path
        self.data = self.load()

    def load(self) -> dict[str, Any]:
        data = read_json(self.path, {})
        merged = dict(self.defaults)
        if isinstance(data, dict):
            merged.update(data)
        return merged

    def save(self) -> None:
        write_json(self.path, self.data)

    def get(self, key: str, default: Any = None) -> Any:
        return self.data.get(key, self.defaults.get(key, default))

    def set(self, key: str, value: Any) -> None:
        self.data[key] = value
        self.save()


def ensure_default_configs() -> None:
    app_path("config").mkdir(parents=True, exist_ok=True)
    app_path("logs").mkdir(parents=True, exist_ok=True)
    app_path("outputs", "images").mkdir(parents=True, exist_ok=True)
    app_path("outputs", "notes").mkdir(parents=True, exist_ok=True)
    app_path("memory").mkdir(parents=True, exist_ok=True)

    if not SETTINGS_PATH.exists():
        SettingsService().save()

    if not PROVIDERS_PATH.exists():
        write_json(
            PROVIDERS_PATH,
            {
                "providers": {
                    "gemini": {
                        "enabled": True,
                        "default_model": "${BRACE_TEXT_MODEL}",
                        "api_key_env": "GEMINI_API_KEY",
                    },
                    "nvidia": {
                        "enabled": False,
                        "base_url": "${NVIDIA_BASE_URL}",
                        "default_model": "${NVIDIA_DEFAULT_MODEL}",
                        "api_key_env": "NVIDIA_API_KEY",
                        "models": [],
                    },
                    "local": {
                        "enabled": False,
                        "base_url": "${LOCAL_AI_BASE_URL}",
                        "default_model": "${LOCAL_AI_DEFAULT_MODEL}",
                    },
                },
                "fallback_order": ["gemini", "nvidia", "local"],
            },
        )

    if not MCP_PATH.exists():
        write_json(
            MCP_PATH,
            {
                "mcpServers": {
                    "nano-banana": {
                        "enabled": False,
                        "command": "npx",
                        "args": ["-y", "${NANO_BANANA_MCP_PACKAGE}"],
                        "env": {"GEMINI_API_KEY": "${GEMINI_API_KEY}"},
                    }
                }
            },
        )
