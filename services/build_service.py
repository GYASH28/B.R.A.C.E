from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from services.path_utils import app_path


@dataclass
class BuildResult:
    ok: bool
    output: str
    exe_path: str


def build_executable(debug: bool = False) -> BuildResult:
    spec = app_path("BRACE.spec")
    if not spec.exists():
        return BuildResult(False, "BRACE.spec not found.", "")
    args = [sys.executable, "-m", "PyInstaller", "--noconfirm"]
    if debug:
        args.append("--clean")
    args.append(str(spec))
    result = subprocess.run(args, cwd=str(app_path()), capture_output=True, text=True)
    output = (result.stdout or "") + "\n" + (result.stderr or "")
    exe = app_path("dist", "BRACE.exe")
    if not exe.exists():
        exe = app_path("dist", "BRACE", "BRACE.exe")
    return BuildResult(result.returncode == 0 and exe.exists(), output[-4000:], str(exe))

