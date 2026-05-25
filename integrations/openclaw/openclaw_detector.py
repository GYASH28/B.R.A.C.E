from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass


@dataclass
class OpenClawStatus:
    installed: bool
    openclaw_path: str
    openclaw_version: str
    node_version: str
    npm_version: str
    gateway_status: str
    gateway_url: str


def _version(cmd: list[str]) -> str:
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
        text = (result.stdout or result.stderr).strip().splitlines()
        return text[0] if text else ("ok" if result.returncode == 0 else "not responding")
    except FileNotFoundError:
        return "not found"
    except Exception as exc:
        return f"error: {exc}"


def detect(gateway_url: str = "http://127.0.0.1:18789") -> OpenClawStatus:
    path = shutil.which("openclaw") or ""
    installed = bool(path)
    gateway = "not checked"
    if installed:
        gateway = _version(["openclaw", "gateway", "status"])
    return OpenClawStatus(
        installed=installed,
        openclaw_path=path or "not found",
        openclaw_version=_version(["openclaw", "--version"]) if installed else "not found",
        node_version=_version(["node", "--version"]),
        npm_version=_version(["npm", "--version"]),
        gateway_status=gateway,
        gateway_url=gateway_url,
    )

