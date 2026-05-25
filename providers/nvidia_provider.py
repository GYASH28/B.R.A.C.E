from __future__ import annotations

from providers.openai_compatible_provider import OpenAICompatibleProvider
from services.settings_service import env, env_bool


class NvidiaProvider(OpenAICompatibleProvider):
    def __init__(self):
        super().__init__(
            name="nvidia",
            base_url=env("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
            api_key_env="NVIDIA_API_KEY",
            default_model=env("NVIDIA_DEFAULT_MODEL"),
            enabled=env_bool("NVIDIA_ENABLED", False),
        )

