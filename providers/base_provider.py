from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass
class ProviderStatus:
    name: str
    enabled: bool
    configured: bool
    model: str
    latency_ms: int | None = None
    last_error: str = ""


class BaseProvider(Protocol):
    name: str

    def status(self) -> ProviderStatus:
        ...

    def test_connection(self) -> ProviderStatus:
        ...

    def chat(self, prompt: str, model: str | None = None) -> str:
        ...

