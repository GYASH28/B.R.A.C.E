from __future__ import annotations

import json
from pathlib import Path

from memory.memory_manager import MEMORY_PATH, load_memory, save_memory, _empty_memory


class MemoryStore:
    def load(self) -> dict:
        return load_memory()

    def search(self, query: str) -> list[str]:
        query = query.lower().strip()
        lines = []
        for category, items in self.load().items():
            if not isinstance(items, dict):
                continue
            for key, entry in items.items():
                value = entry.get("value") if isinstance(entry, dict) else entry
                text = f"{category}/{key}: {value}"
                if not query or query in text.lower():
                    lines.append(text)
        return lines

    def export(self, path: str) -> str:
        target = Path(path)
        target.write_text(json.dumps(self.load(), indent=2, ensure_ascii=False), encoding="utf-8")
        return str(target)

    def clear(self) -> None:
        save_memory(_empty_memory())

