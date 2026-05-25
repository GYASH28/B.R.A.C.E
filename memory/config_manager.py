from __future__ import annotations

from config import get_gemini_api_key, is_configured


def config_exists() -> bool:
    return is_configured()


def save_api_keys(api_key: str) -> None:
    raise RuntimeError("B.R.A.C.E. reads secrets from .env only. Update GEMINI_API_KEY in .env.")


def load_api_keys() -> dict:
    key = get_gemini_api_key(required=False)
    return {"GEMINI_API_KEY": key} if key else {}


def get_gemini_key() -> str | None:
    return get_gemini_api_key(required=False) or None
