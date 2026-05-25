from __future__ import annotations

import time
from dataclasses import dataclass

from providers.base_provider import ProviderStatus
from services.settings_service import env


@dataclass
class OpenAICompatibleProvider:
    name: str
    base_url: str
    api_key_env: str = ""
    default_model: str = ""
    enabled: bool = False
    timeout: int = 30

    def _api_key(self) -> str:
        return env(self.api_key_env) if self.api_key_env else ""

    def _configured(self) -> bool:
        return bool(self.base_url and self.default_model and (not self.api_key_env or self._api_key()))

    def status(self) -> ProviderStatus:
        return ProviderStatus(self.name, self.enabled, self._configured(), self.default_model)

    def test_connection(self) -> ProviderStatus:
        status = self.status()
        if not status.configured:
            status.last_error = "Missing base URL, model, or API key."
            return status
        start = time.perf_counter()
        try:
            self.chat("Reply with the single word READY.", model=self.default_model)
            status.latency_ms = int((time.perf_counter() - start) * 1000)
        except Exception as exc:
            status.last_error = str(exc)[:240]
        return status

    def chat(self, prompt: str, model: str | None = None) -> str:
        import requests

        url = self.base_url.rstrip("/") + "/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self._api_key():
            headers["Authorization"] = f"Bearer {self._api_key()}"
        payload = {
            "model": model or self.default_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.4,
            "stream": False,
        }
        response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
