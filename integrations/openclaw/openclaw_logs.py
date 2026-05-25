from __future__ import annotations

from services.logging_service import read_log_lines


def latest_lines(max_lines: int = 120) -> list[str]:
    return read_log_lines("openclaw", max_lines)

