from __future__ import annotations

from providers.base_provider import ProviderStatus
from services.settings_service import env, env_bool


class OpenClawProvider:
    name = "openclaw"

    def __init__(self):
        self.gateway_url = env("OPENCLAW_GATEWAY_URL", "http://127.0.0.1:18789")
        self.enabled = env_bool("OPENCLAW_ENABLED", False)

    def status(self) -> ProviderStatus:
        return ProviderStatus(self.name, self.enabled, bool(self.gateway_url), "openclaw-gateway")

    def test_connection(self) -> ProviderStatus:
        status = self.status()
        try:
            import requests

            response = requests.get(self.gateway_url.rstrip("/") + "/health", timeout=3)
            if response.status_code >= 400:
                status.last_error = f"HTTP {response.status_code}"
        except Exception as exc:
            status.last_error = str(exc)[:240]
        return status

    def chat(self, prompt: str, model: str | None = None) -> str:
        raise NotImplementedError("OpenClaw gateway chat endpoint is installation-specific in V1.")
