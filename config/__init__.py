from __future__ import annotations

import platform
import sys
from pathlib import Path
from typing import Any

from services.logging_service import mask_secret
from services.settings_service import (
    SettingsService,
    env,
    env_bool,
    env_int,
    ensure_default_configs,
    read_json,
    write_json,
)


def get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


BASE_DIR = get_base_dir()
RUNTIME_CONFIG_PATH = BASE_DIR / "config" / "runtime.json"

DEFAULT_LIVE_MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025"
DEFAULT_TEXT_MODEL = "gemini-2.5-flash"
DEFAULT_VOICE_NAME = "Charon"

ensure_default_configs()


def _env(name: str, default: str = "") -> str:
    return env(name, default)


def get_gemini_api_key(required: bool = True) -> str:
    key = _env("GEMINI_API_KEY")
    placeholder = any(x in key.lower() for x in ("your_", "paste_", "placeholder"))
    if required and (not key or placeholder):
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. Create a .env file from "
            ".env.example and add a real Gemini API key."
        )
    return "" if placeholder else key


def is_configured() -> bool:
    return bool(get_gemini_api_key(required=False))


def get_live_model() -> str:
    return _env("BRACE_LIVE_MODEL", DEFAULT_LIVE_MODEL)


def get_text_model() -> str:
    return _env("BRACE_TEXT_MODEL", DEFAULT_TEXT_MODEL)


def get_voice_name() -> str:
    return _env("BRACE_VOICE_NAME", DEFAULT_VOICE_NAME)


def get_response_style() -> str:
    return _env("BRACE_RESPONSE_STYLE", "clear, confident, helpful")


def get_voice_enabled() -> bool:
    return env_bool("BRACE_VOICE_ENABLED", True)


def get_assistant_name() -> str:
    return _env("BRACE_ASSISTANT_NAME", str(app_setting("assistant_name", "B.R.A.C.E."))) or "B.R.A.C.E."


def get_music_dir() -> str:
    return _env("BRACE_MUSIC_DIR", str(app_setting("music_dir", Path.home() / "Music")))


def get_notes_dir() -> str:
    return _env("BRACE_NOTES_DIR", str(app_setting("notes_dir", BASE_DIR / "outputs" / "notes")))


def get_legacy_voice_enabled() -> bool:
    return env_bool("BRACE_LEGACY_VOICE_ENABLED", bool(app_setting("legacy_voice_enabled", False)))


def get_legacy_stt_enabled() -> bool:
    return env_bool("BRACE_LEGACY_STT_ENABLED", bool(app_setting("legacy_stt_enabled", False)))


def get_safe_mode() -> bool:
    return env_bool("SAFE_MODE", True)


def get_os() -> str:
    override = _env("BRACE_OS").lower()
    if override in {"windows", "mac", "linux"}:
        return override
    current = platform.system().lower()
    if current == "darwin":
        return "mac"
    if current.startswith("win"):
        return "windows"
    if current.startswith("linux"):
        return "linux"
    return "windows"


def is_windows() -> bool:
    return get_os() == "windows"


def is_mac() -> bool:
    return get_os() == "mac"


def is_linux() -> bool:
    return get_os() == "linux"


def load_runtime_config() -> dict[str, Any]:
    return read_json(RUNTIME_CONFIG_PATH, {})


def save_runtime_value(key: str, value: Any) -> None:
    data = load_runtime_config()
    data[key] = value
    write_json(RUNTIME_CONFIG_PATH, data)


def get_runtime_value(key: str, default: Any = None) -> Any:
    return load_runtime_config().get(key, default)


def masked_api_key() -> str:
    key = get_gemini_api_key(required=False)
    return "Not configured" if not key else mask_secret(key)


def provider_key_status(env_name: str) -> str:
    value = _env(env_name)
    if not value:
        return "Not configured"
    if any(x in value.lower() for x in ("your_", "paste_", "placeholder")):
        return "Placeholder"
    return mask_secret(value)


def app_setting(key: str, default: Any = None) -> Any:
    return SettingsService().get(key, default)
