from __future__ import annotations

import os
import platform
import random
import subprocess
from pathlib import Path

from config import get_music_dir


AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".flac", ".aac", ".ogg", ".wma"}


def _music_root(params: dict) -> Path:
    return Path(params.get("music_dir") or get_music_dir()).expanduser().resolve()


def _audio_files(root: Path) -> list[Path]:
    if not root.exists() or not root.is_dir():
        return []
    files = [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in AUDIO_EXTENSIONS]
    files.sort(key=lambda p: p.name.lower())
    return files


def _format_files(root: Path, files: list[Path], limit: int = 20) -> str:
    if not files:
        return f"No audio files found in {root}."
    lines = [f"Found {len(files)} audio file(s) in {root}:"]
    for path in files[:limit]:
        try:
            label = path.relative_to(root)
        except ValueError:
            label = path.name
        lines.append(f"- {label}")
    if len(files) > limit:
        lines.append(f"...and {len(files) - limit} more.")
    return "\n".join(lines)


def _open_file(path: Path) -> None:
    system = platform.system()
    if system == "Windows":
        os.startfile(str(path))  # type: ignore[attr-defined]
    elif system == "Darwin":
        subprocess.Popen(["open", str(path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        subprocess.Popen(["xdg-open", str(path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def media_player(
    parameters: dict | None = None,
    response=None,
    player=None,
    session_memory=None,
) -> str:
    params = parameters or {}
    action = str(params.get("action", "list")).lower().strip().replace(" ", "_")
    query = str(params.get("query") or params.get("song") or "").strip().lower()
    root = _music_root(params)

    if player:
        player.write_log(f"[Media] {action} {query}".strip())

    files = _audio_files(root)
    if query:
        files = [p for p in files if query in p.stem.lower() or query in p.name.lower()]

    if action in {"list", "search"}:
        return _format_files(root, files)

    if action in {"play", "open"}:
        if not files:
            target = f" matching '{query}'" if query else ""
            return f"No audio files{target} found in {root}."
        choice = files[0] if query else random.choice(files)
        try:
            _open_file(choice)
            return f"Playing {choice.name}."
        except Exception as exc:
            return f"Could not play {choice.name}: {exc}"

    return f"Unknown media action: {action}."
