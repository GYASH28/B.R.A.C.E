from __future__ import annotations

from dataclasses import dataclass

from services.security_service import SafetyLevel


@dataclass(frozen=True)
class ToolCard:
    name: str
    description: str
    status: str
    safety: SafetyLevel
    prompt: str

