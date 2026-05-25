from __future__ import annotations

import time

from providers.base_provider import ProviderStatus
from services.settings_service import env


class GeminiProvider:
    name = "gemini"

    def __init__(self):
        self.default_model = env("BRACE_TEXT_MODEL", "gemini-2.5-flash")
        self.enabled = True

    def _api_key(self) -> str:
        return env("GEMINI_API_KEY")

    def status(self) -> ProviderStatus:
        return ProviderStatus(self.name, self.enabled, bool(self._api_key()), self.default_model)

    def test_connection(self) -> ProviderStatus:
        status = self.status()
        if not status.configured:
            status.last_error = "GEMINI_API_KEY is missing."
            return status
        start = time.perf_counter()
        try:
            self.chat("Reply with the single word READY.")
            status.latency_ms = int((time.perf_counter() - start) * 1000)
        except Exception as exc:
            status.last_error = str(exc)[:240]
        return status

    def chat(self, prompt: str, model: str | None = None) -> str:
        from google import genai

        client = genai.Client(api_key=self._api_key())
        response = client.models.generate_content(model=model or self.default_model, contents=prompt)
        return getattr(response, "text", "") or ""

