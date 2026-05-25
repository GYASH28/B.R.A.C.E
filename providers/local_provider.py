from __future__ import annotations

from providers.openai_compatible_provider import OpenAICompatibleProvider
from services.settings_service import env, env_bool


class LocalProvider(OpenAICompatibleProvider):
    def __init__(self):
        super().__init__(
            name="local",
            base_url=env("LOCAL_AI_BASE_URL", "http://localhost:11434/v1"),
            api_key_env="",
            default_model=env("LOCAL_AI_DEFAULT_MODEL", "local-model-name"),
            enabled=env_bool("LOCAL_AI_ENABLED", False),
        )

