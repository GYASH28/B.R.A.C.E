from __future__ import annotations

import logging
import re
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Iterable

from services.path_utils import app_path


SECRET_PATTERNS = (
    re.compile(r"(api[_-]?key\s*=\s*)([^\s]+)", re.IGNORECASE),
    re.compile(r"(authorization:\s*bearer\s+)([A-Za-z0-9._\-]+)", re.IGNORECASE),
    re.compile(r"AIza[0-9A-Za-z_\-]{20,}"),
    re.compile(r"nvapi-[0-9A-Za-z_\-]{16,}", re.IGNORECASE),
)


def mask_secret(value: str, visible: int = 4) -> str:
    text = str(value or "")
    if not text:
        return ""
    if len(text) <= visible * 2:
        return "configured"
    return f"{text[:visible]}...{text[-visible:]}"


def redact(text: object) -> str:
    output = str(text)
    for pattern in SECRET_PATTERNS:
        if pattern.groups >= 2:
            output = pattern.sub(lambda m: f"{m.group(1)}[redacted]", output)
        else:
            output = pattern.sub("[redacted]", output)
    return output


class BraceLog:
    _configured = False

    @classmethod
    def configure(cls) -> None:
        if cls._configured:
            return
        log_dir = app_path("logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        root = logging.getLogger("brace")
        root.setLevel(logging.INFO)
        root.handlers.clear()
        for name in ("app", "providers", "openclaw", "mcp", "automation", "errors"):
            handler = RotatingFileHandler(
                log_dir / f"{name}.log",
                maxBytes=700_000,
                backupCount=3,
                encoding="utf-8",
            )
            handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
            root.addHandler(handler)
        cls._configured = True

    @classmethod
    def logger(cls, name: str = "app") -> logging.Logger:
        cls.configure()
        return logging.getLogger(f"brace.{name}")

    @classmethod
    def info(cls, name: str, message: object) -> None:
        cls.logger(name).info(redact(message))

    @classmethod
    def warning(cls, name: str, message: object) -> None:
        cls.logger(name).warning(redact(message))

    @classmethod
    def error(cls, name: str, message: object) -> None:
        cls.logger(name).error(redact(message))


def read_log_lines(log_name: str = "app", max_lines: int = 300) -> list[str]:
    path = app_path("logs", f"{log_name}.log")
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    return lines[-max_lines:]


def clear_logs(names: Iterable[str] | None = None) -> None:
    log_dir = app_path("logs")
    targets = names or ("app", "providers", "openclaw", "mcp", "automation", "errors")
    for name in targets:
        path = log_dir / f"{name}.log"
        if path.exists():
            path.write_text("", encoding="utf-8")

