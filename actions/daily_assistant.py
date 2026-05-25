from __future__ import annotations

import datetime as _dt
import re
from typing import Any

from config import get_assistant_name
from services.settings_service import SettingsService


_NAME_RE = re.compile(r"[^A-Za-z0-9 ._-]+")


def _clean_name(value: str) -> str:
    name = _NAME_RE.sub("", value or "").strip()
    name = re.sub(r"\s+", " ", name)
    return name[:48]


def _now(params: dict[str, Any]) -> _dt.datetime:
    fixed = params.get("now")
    if isinstance(fixed, _dt.datetime):
        return fixed
    if isinstance(fixed, str) and fixed.strip():
        try:
            return _dt.datetime.fromisoformat(fixed.strip())
        except ValueError:
            pass
    return _dt.datetime.now()


def greeting_for_hour(hour: int, assistant_name: str | None = None) -> str:
    if 4 <= hour < 12:
        part = "Good morning"
    elif 12 <= hour < 16:
        part = "Good afternoon"
    elif 16 <= hour < 24:
        part = "Good evening"
    else:
        part = "Good night"
    name = assistant_name or get_assistant_name()
    return f"{part}. {name} is ready to assist you."


def current_time_text(now: _dt.datetime | None = None) -> str:
    now = now or _dt.datetime.now()
    return f"The current time is {now.strftime('%I:%M:%S %p')}."


def current_date_text(now: _dt.datetime | None = None) -> str:
    now = now or _dt.datetime.now()
    return f"Today is {now.strftime('%A, %B %d, %Y')}."


def _wikipedia_summary(query: str, sentences: int = 2) -> str:
    if not query:
        return "Please provide a Wikipedia topic."
    try:
        import wikipedia
    except Exception as exc:
        return f"Wikipedia support is not available: {exc}"

    try:
        result = wikipedia.summary(query, sentences=max(1, min(5, int(sentences or 2))))
        return result.strip() or f"No Wikipedia summary found for {query}."
    except Exception as exc:
        exc_name = exc.__class__.__name__
        if exc_name == "DisambiguationError":
            options = getattr(exc, "options", [])[:5]
            suffix = f" Try one of: {', '.join(options)}." if options else ""
            return f"Multiple Wikipedia results matched {query}.{suffix}"
        if exc_name == "PageError":
            return f"I could not find a Wikipedia page for {query}."
        return f"Wikipedia search failed: {exc}"


def _joke() -> str:
    try:
        import pyjokes
        return str(pyjokes.get_joke()).strip()
    except Exception as exc:
        return f"Joke support is not available: {exc}"


def daily_assistant(
    parameters: dict | None = None,
    response=None,
    player=None,
    session_memory=None,
) -> str:
    params = parameters or {}
    action = str(params.get("action", "greet")).lower().strip().replace(" ", "_")

    if player:
        player.write_log(f"[Daily] {action}")

    if action in {"greet", "wishme", "hello"}:
        now = _now(params)
        return greeting_for_hour(now.hour, get_assistant_name())

    if action in {"time", "current_time"}:
        return current_time_text(_now(params))

    if action in {"date", "current_date", "today"}:
        return current_date_text(_now(params))

    if action in {"wikipedia", "wiki", "search_wikipedia"}:
        query = str(params.get("query") or params.get("topic") or "").strip()
        return _wikipedia_summary(query, int(params.get("sentences", 2) or 2))

    if action in {"joke", "tell_joke"}:
        return _joke()

    if action in {"get_name", "name"}:
        return f"My display name is {get_assistant_name()}."

    if action in {"set_name", "change_name", "rename"}:
        name = _clean_name(str(params.get("name") or params.get("value") or ""))
        if not name:
            return "Please provide a new assistant name."
        SettingsService().set("assistant_name", name)
        return f"Assistant display name set to {name}."

    return f"Unknown daily assistant action: {action}."
