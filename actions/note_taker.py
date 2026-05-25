from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

from config import get_notes_dir


_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9_. -]+")


def _notes_root(params: dict) -> Path:
    return Path(params.get("notes_dir") or get_notes_dir()).expanduser().resolve()


def _safe_title(title: str) -> str:
    value = _SAFE_NAME_RE.sub("", title or "").strip().replace(" ", "_")
    return value[:80] or datetime.now().strftime("note_%Y%m%d_%H%M%S")


def _note_path(params: dict, root: Path) -> Path:
    raw_path = str(params.get("path") or "").strip()
    if raw_path:
        path = Path(raw_path).expanduser().resolve()
    else:
        title = str(params.get("title") or params.get("name") or "").strip()
        path = root / f"{_safe_title(title)}.txt"
    root.mkdir(parents=True, exist_ok=True)
    try:
        path.relative_to(root)
    except ValueError:
        confirmed = str(params.get("confirmed") or params.get("confirm") or "").lower().strip()
        if confirmed not in {"1", "true", "yes", "y", "confirm", "confirmed", "allow"}:
            raise ValueError(f"Notes can only be written inside {root} without confirmation.")
    return path


def _list_notes(root: Path) -> str:
    root.mkdir(parents=True, exist_ok=True)
    notes = sorted(root.glob("*.txt"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not notes:
        return f"No notes found in {root}."
    lines = [f"{len(notes)} note(s) in {root}:"]
    for note in notes[:30]:
        lines.append(f"- {note.name}")
    if len(notes) > 30:
        lines.append(f"...and {len(notes) - 30} more.")
    return "\n".join(lines)


def _search_notes(root: Path, query: str) -> str:
    if not query:
        return "Please provide text to search for."
    root.mkdir(parents=True, exist_ok=True)
    matches = []
    for note in sorted(root.glob("*.txt")):
        text = note.read_text(encoding="utf-8", errors="ignore")
        if query.lower() in text.lower() or query.lower() in note.name.lower():
            snippet = next((line.strip() for line in text.splitlines() if query.lower() in line.lower()), "")
            matches.append(f"- {note.name}: {snippet[:120]}")
    return "\n".join(matches) if matches else f"No notes matched '{query}'."


def note_taker(
    parameters: dict | None = None,
    response=None,
    player=None,
    session_memory=None,
) -> str:
    params = parameters or {}
    action = str(params.get("action", "create")).lower().strip().replace(" ", "_")
    root = _notes_root(params)

    if player:
        player.write_log(f"[Notes] {action}")

    if action in {"list", "all"}:
        return _list_notes(root)

    if action in {"search", "find"}:
        query = str(params.get("query") or params.get("text") or "").strip()
        return _search_notes(root, query)

    if action in {"create", "write", "append", "read"}:
        path = _note_path(params, root)
        if action == "read":
            if not path.exists():
                return f"Note not found: {path.name}"
            return path.read_text(encoding="utf-8", errors="ignore") or f"{path.name} is empty."

        content = str(params.get("content") or params.get("text") or params.get("note") or "").strip()
        if not content:
            return "Please provide note content."
        stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        if action == "append" and path.exists():
            with path.open("a", encoding="utf-8") as fh:
                fh.write(f"\n\n[{stamp}]\n{content}\n")
            return f"Appended note: {path.name}"
        path.write_text(f"[{stamp}]\n{content}\n", encoding="utf-8")
        return f"Saved note: {path.name}"

    return f"Unknown note action: {action}."
