from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SPEC = ROOT / "BRACE.spec"


def ensure_pyinstaller() -> None:
    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)


def build(debug: bool = False) -> Path:
    if not SPEC.exists():
        raise FileNotFoundError("BRACE.spec not found.")
    ensure_pyinstaller()
    cmd = [sys.executable, "-m", "PyInstaller", "--noconfirm"]
    if debug:
        cmd.append("--clean")
    cmd.append(str(SPEC))
    subprocess.run(cmd, cwd=str(ROOT), check=True)
    onefile = ROOT / "dist" / "BRACE.exe"
    onedir = ROOT / "dist" / "BRACE" / "BRACE.exe"
    return onefile if onefile.exists() else onedir


def main() -> None:
    parser = argparse.ArgumentParser(description="Build B.R.A.C.E. Windows executable.")
    parser.add_argument("--debug", action="store_true", help="Clean build artifacts and keep verbose PyInstaller output.")
    args = parser.parse_args()
    exe = build(debug=args.debug)
    print("Build complete.")
    print(f"Executable: {exe}")


if __name__ == "__main__":
    main()
