from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any

from config import get_notes_dir
from services.settings_service import SettingsService, env_bool


class SafetyLevel(str, Enum):
    SAFE = "Safe"
    CONFIRMATION = "Confirmation Required"
    RESTRICTED = "Restricted"
    DISABLED = "Disabled"


@dataclass
class SecurityDecision:
    allowed: bool
    level: SafetyLevel
    message: str
    preview: str = ""


TRUE_VALUES = {"1", "true", "yes", "y", "confirm", "confirmed", "allow"}


def _confirmed(params: dict[str, Any]) -> bool:
    value = str(params.get("confirmed", params.get("confirm", ""))).lower().strip()
    return value in TRUE_VALUES


class SecurityService:
    risky_tools = {
        "send_message",
        "browser_control",
        "computer_control",
        "computer_settings",
        "desktop_control",
        "file_controller",
        "dev_agent",
        "code_helper",
        "agent_task",
        "game_updater",
        "openclaw",
        "mcp_server",
        "generated_code",
        "media_player",
        "note_taker",
    }
    restricted_file_actions = {"delete", "move", "write", "rename", "create_file", "create_folder", "organize_desktop"}
    dangerous_system_actions = {"restart", "shutdown", "toggle_wifi", "dark_mode", "close_app", "open_run"}
    interactive_actions = {"type", "smart_type", "click", "double_click", "right_click", "hotkey", "press", "screen_click"}

    def __init__(self, safe_mode: bool | None = None):
        default_safe = bool(SettingsService().get("safe_mode", True))
        self.safe_mode = env_bool("SAFE_MODE", default_safe) if safe_mode is None else safe_mode

    def evaluate_tool(self, tool_name: str, params: dict[str, Any] | None = None) -> SecurityDecision:
        params = params or {}
        tool = (tool_name or "").lower()
        level = self.level_for(tool, params)
        preview = self.preview(tool, params)

        if level == SafetyLevel.SAFE:
            return SecurityDecision(True, level, "Allowed.", preview)
        if level == SafetyLevel.DISABLED:
            return SecurityDecision(False, level, "This action is disabled by B.R.A.C.E. safety policy.", preview)

        if not self.safe_mode and level == SafetyLevel.CONFIRMATION:
            return SecurityDecision(True, level, "Allowed because Safe Mode is off.", preview)

        if _confirmed(params):
            return SecurityDecision(True, level, "Confirmed by user.", preview)

        message = (
            "B.R.A.C.E. needs permission before executing this action. "
            "Review the action preview and run again with confirmed=yes."
        )
        if level == SafetyLevel.RESTRICTED and self.safe_mode:
            message = (
                "Safe Mode blocked this restricted action. "
                "Turn Safe Mode off or explicitly run again with confirmed=yes after reviewing it."
            )
        return SecurityDecision(False, level, message, preview)

    def level_for(self, tool: str, params: dict[str, Any]) -> SafetyLevel:
        if tool not in self.risky_tools:
            return SafetyLevel.SAFE
        if tool == "file_controller":
            action = str(params.get("action", "")).lower()
            return SafetyLevel.CONFIRMATION if action in self.restricted_file_actions else SafetyLevel.SAFE
        if tool == "media_player":
            action = str(params.get("action", "")).lower()
            return SafetyLevel.CONFIRMATION if action in {"play", "open"} else SafetyLevel.SAFE
        if tool == "note_taker":
            action = str(params.get("action", "")).lower()
            if action in {"create", "write", "append", "read"} and self._custom_note_path(params):
                return SafetyLevel.CONFIRMATION
            return SafetyLevel.SAFE
        if tool == "computer_settings":
            action = str(params.get("action") or params.get("description") or "").lower().replace(" ", "_")
            return SafetyLevel.RESTRICTED if action in self.dangerous_system_actions else SafetyLevel.CONFIRMATION
        if tool == "computer_control":
            action = str(params.get("action", "")).lower()
            return SafetyLevel.CONFIRMATION if action in self.interactive_actions else SafetyLevel.SAFE
        if tool == "game_updater" and str(params.get("shutdown_when_done", "")).lower() in TRUE_VALUES:
            return SafetyLevel.RESTRICTED
        if tool in {"dev_agent", "code_helper", "agent_task", "generated_code", "openclaw", "mcp_server"}:
            return SafetyLevel.RESTRICTED
        return SafetyLevel.CONFIRMATION

    def preview(self, tool: str, params: dict[str, Any]) -> str:
        clean = {k: ("[redacted]" if "key" in k.lower() or "token" in k.lower() else v) for k, v in params.items()}
        return f"{tool}: {clean}"

    def _custom_note_path(self, params: dict[str, Any]) -> bool:
        raw = str(params.get("path") or "").strip()
        if not raw:
            return False
        try:
            path = Path(raw).expanduser().resolve()
            root = Path(str(params.get("notes_dir") or get_notes_dir())).expanduser().resolve()
            path.relative_to(root)
            return False
        except Exception:
            return True
