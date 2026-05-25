from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

from services.path_utils import app_path


HISTORY_PATH = app_path("outputs", "images", "history.json")


@dataclass
class ImageRecord:
    path: str
    prompt: str
    model: str
    created_at: str
    reference: str = ""


class ImageHistory:
    def load(self) -> list[ImageRecord]:
        try:
            raw = json.loads(HISTORY_PATH.read_text(encoding="utf-8"))
            return [ImageRecord(**item) for item in raw if isinstance(item, dict)]
        except Exception:
            return []

    def add(self, path: Path, prompt: str, model: str, reference: str = "") -> ImageRecord:
        record = ImageRecord(str(path), prompt, model, datetime.now().isoformat(timespec="seconds"), reference)
        records = self.load()
        records.insert(0, record)
        HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
        HISTORY_PATH.write_text(
            json.dumps([asdict(r) for r in records[:100]], indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        return record

