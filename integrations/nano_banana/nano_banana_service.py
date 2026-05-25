from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from PIL import Image

from integrations.nano_banana.image_history import ImageHistory, ImageRecord
from services.logging_service import BraceLog, redact
from services.path_utils import app_path
from services.settings_service import env


@dataclass
class NanoBananaResult:
    ok: bool
    message: str
    image_path: str = ""


class NanoBananaService:
    def __init__(self):
        self.output_dir = Path(env("NANO_BANANA_OUTPUT_DIR", str(app_path("outputs", "images"))))
        if not self.output_dir.is_absolute():
            self.output_dir = app_path(*self.output_dir.parts)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.history = ImageHistory()

    def key_status(self) -> str:
        key = env("GEMINI_API_KEY")
        if not key:
            return "GEMINI_API_KEY missing"
        if "your_" in key.lower() or "paste_" in key.lower():
            return "GEMINI_API_KEY placeholder"
        return "configured"

    def generate(
        self,
        prompt: str,
        model: str | None = None,
        reference_path: str = "",
        aspect_ratio: str = "1:1",
        image_size: str = "1K",
    ) -> NanoBananaResult:
        if self.key_status() != "configured":
            return NanoBananaResult(False, "Add GEMINI_API_KEY in .env before generating images.")
        prompt = (prompt or "").strip()
        if not prompt:
            return NanoBananaResult(False, "Enter an image prompt first.")
        model = model or env("NANOBANANA_MODEL", "gemini-2.0-flash-exp")

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=env("GEMINI_API_KEY"))
            contents: list[object] = [prompt]
            if reference_path:
                ref = Image.open(reference_path)
                contents.append(ref)

            config = types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                response_format={"image": {"aspect_ratio": aspect_ratio, "image_size": image_size}},
            )
            response = client.models.generate_content(model=model, contents=contents, config=config)
            image = self._extract_image(response)
            if image is None:
                text = getattr(response, "text", "")
                return NanoBananaResult(False, text or "Gemini returned no image.")

            filename = f"brace_image_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            path = self.output_dir / filename
            image.save(path)
            self.history.add(path, prompt, model, reference_path)
            BraceLog.info("providers", f"Nano Banana image saved: {path}")
            return NanoBananaResult(True, f"Image generated: {path.name}", str(path))
        except Exception as exc:
            BraceLog.error("providers", redact(exc))
            return NanoBananaResult(False, f"Image generation failed: {exc}")

    def _extract_image(self, response):
        parts = getattr(response, "parts", None)
        if not parts and getattr(response, "candidates", None):
            try:
                parts = response.candidates[0].content.parts
            except Exception:
                parts = []
        for part in parts or []:
            try:
                image = part.as_image()
                if image is not None:
                    return image
            except Exception:
                pass
            inline = getattr(part, "inline_data", None) or getattr(part, "inlineData", None)
            if inline is not None:
                try:
                    import base64
                    import io

                    data = getattr(inline, "data", None)
                    if isinstance(data, str):
                        data = base64.b64decode(data)
                    if data:
                        return Image.open(io.BytesIO(data))
                except Exception:
                    pass
        return None

    def recent(self) -> list[ImageRecord]:
        return self.history.load()

