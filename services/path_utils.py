from __future__ import annotations

import sys
from pathlib import Path


def base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


BASE_DIR = base_dir()


def app_path(*parts: str) -> Path:
    return BASE_DIR.joinpath(*parts)

