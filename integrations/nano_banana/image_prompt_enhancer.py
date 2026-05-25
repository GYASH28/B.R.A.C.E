from __future__ import annotations


def enhance_prompt(prompt: str) -> str:
    base = (prompt or "").strip()
    if not base:
        return ""
    additions = (
        "cinematic lighting, crisp subject definition, premium futuristic composition, "
        "high detail, coherent text rendering when text is requested"
    )
    if additions.lower() in base.lower():
        return base
    return f"{base}. Style and quality: {additions}."

