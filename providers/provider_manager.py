from __future__ import annotations

from providers.base_provider import ProviderStatus
from providers.gemini_provider import GeminiProvider
from providers.local_provider import LocalProvider
from providers.nvidia_provider import NvidiaProvider
from providers.openclaw_provider import OpenClawProvider


class ProviderManager:
    modes = {
        "Auto Mode": ["gemini", "nvidia", "local"],
        "Fast Mode": ["gemini", "local", "nvidia"],
        "Coding Mode": ["nvidia", "gemini", "local"],
        "Creative Mode": ["gemini", "nvidia", "local"],
        "Study Mode": ["gemini", "local", "nvidia"],
        "Reasoning Mode": ["nvidia", "gemini", "local"],
        "Image Mode": ["gemini"],
        "Offline/Safe Mode": ["local"],
        "Low-Cost Mode": ["local", "gemini"],
        "Power Mode": ["nvidia", "gemini", "local"],
    }

    def __init__(self):
        self.providers = {
            "gemini": GeminiProvider(),
            "nvidia": NvidiaProvider(),
            "local": LocalProvider(),
            "openclaw": OpenClawProvider(),
        }

    def statuses(self) -> list[ProviderStatus]:
        return [provider.status() for provider in self.providers.values()]

    def test_all(self) -> list[ProviderStatus]:
        return [provider.test_connection() for provider in self.providers.values()]

    def route(self, prompt: str, mode: str = "Auto Mode") -> str:
        order = self.modes.get(mode, self.modes["Auto Mode"])
        errors = []
        for name in order:
            provider = self.providers.get(name)
            if not provider:
                continue
            status = provider.status()
            if not status.enabled or not status.configured:
                errors.append(f"{name}: not configured")
                continue
            try:
                return provider.chat(prompt)
            except Exception as exc:
                errors.append(f"{name}: {exc}")
        return "No configured provider could complete the request. " + "; ".join(errors)

