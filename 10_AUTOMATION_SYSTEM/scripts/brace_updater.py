
from __future__ import annotations

import argparse
import email.utils
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
VAULT = SCRIPT_DIR.parents[1]
CONFIG = VAULT / "10_AUTOMATION_SYSTEM" / "config" / "sources.json"
STATE_DIR = VAULT / "10_AUTOMATION_SYSTEM" / "state"
LOG_DIR = VAULT / "10_AUTOMATION_SYSTEM" / "logs"
SEEN_FILE = STATE_DIR / "seen_items.json"
HASH_FILE = STATE_DIR / "page_hashes.json"
LOG_FILE = LOG_DIR / "update-log.md"
INBOX_LINKS = VAULT / "01_INBOX" / "Articles To Process.md"
USER_AGENT = "BRACE Knowledge Brain Updater/1.0"


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def today() -> str:
    return datetime.now().date().isoformat()


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def log(message: str) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    line = f"- {now_iso()} - {message}\n"
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(line)
    print(message)


def fetch(url: str, timeout: int = 25) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def slugify(text: str, max_len: int = 90) -> str:
    text = html.unescape(text)
    text = re.sub(r"[\\/:*?\"<>|#^[\]]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = text[:max_len].strip()
    return text or "untitled"


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()


def strip_html(text: str) -> str:
    text = re.sub(r"(?is)<script.*?</script>|<style.*?</style>", " ", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_date(value: str | None) -> str:
    if not value:
        return ""
    try:
        dt = email.utils.parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone().date().isoformat()
    except Exception:
        return value[:30]


@dataclass
class FeedItem:
    title: str
    link: str
    published: str
    summary: str
    guid: str


def parse_rss(xml_text: str) -> list[FeedItem]:
    root = ET.fromstring(xml_text)
    items: list[FeedItem] = []

    channel_items = root.findall(".//item")
    if channel_items:
        for item in channel_items:
            title = (item.findtext("title") or "Untitled").strip()
            link = (item.findtext("link") or "").strip()
            published = parse_date(item.findtext("pubDate") or item.findtext("published"))
            summary = strip_html(item.findtext("description") or item.findtext("summary") or "")
            guid = (item.findtext("guid") or link or title).strip()
            items.append(FeedItem(title, link, published, summary, guid))
        return items

    ns = {"atom": "http://www.w3.org/2005/Atom"}
    for entry in root.findall(".//atom:entry", ns):
        title = (entry.findtext("atom:title", default="", namespaces=ns) or "Untitled").strip()
        link_el = entry.find("atom:link", ns)
        link = link_el.attrib.get("href", "") if link_el is not None else ""
        published = parse_date(entry.findtext("atom:published", default="", namespaces=ns) or entry.findtext("atom:updated", default="", namespaces=ns))
        summary = strip_html(entry.findtext("atom:summary", default="", namespaces=ns) or entry.findtext("atom:content", default="", namespaces=ns) or "")
        guid = (entry.findtext("atom:id", default="", namespaces=ns) or link or title).strip()
        items.append(FeedItem(title, link, published, summary, guid))
    return items


def yaml_list(values: list[str]) -> str:
    return "[" + ", ".join(values) + "]"


def maybe_ai_summary(title: str, source_url: str, source_text: str) -> str:
    # This intentionally avoids pretending to summarize when no API key is configured.
    # Add your own OpenAI/Gemini/Claude call here when ready.
    if os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("ANTHROPIC_API_KEY"):
        return "AI summary key detected, but summarization is not enabled in this starter script yet. Review source manually."
    if source_text:
        return f"Auto-summary pending. Source fetched successfully; review the original item before using it. Title: {title}"
    return "Update not verified. Source unavailable."


def markdown_for_feed(source: dict[str, Any], item: FeedItem) -> str:
    retrieved = today()
    item_summary = item.summary[:700] if item.summary else maybe_ai_summary(item.title, item.link, "")
    tags = source.get("tags", [])
    note_type = source.get("type", "world-update")
    category = source.get("category", "")
    reliability = source.get("reliability", 3)
    return f"""---
title: "{item.title.replace('"', "'")}"
date: {retrieved}
source: "{item.link}"
published: {item.published or ""}
retrieved: {retrieved}
category: {category}
reliability: {reliability}
type: {note_type}
tags: {yaml_list(tags)}
---
# {item.title}

## Summary
{item_summary}

## Key Points
- Source captured from {source.get("name", "RSS source")}.
- Published date: {item.published or "Not provided by feed"}.
- Retrieved date: {retrieved}.

## Why It Matters
- Review manually and connect to studies, projects, or current affairs if useful.

## Source URL
{item.link}

## Related Notes
- [[B.R.A.C.E Master Dashboard]]
- [[Source Reliability System]]

## My Thoughts
- [ ] Read original source before using this information.
"""


def markdown_for_page_change(source: dict[str, Any], old_hash: str | None, new_hash: str) -> str:
    retrieved = today()
    title = f"{source.get('name', 'Official page')} changed - {retrieved}"
    tags = source.get("tags", ["cwit", "source/official"])
    return f"""---
title: "{title}"
date: {retrieved}
source: "{source.get("url", "")}"
official: {str(source.get("official", True)).lower()}
retrieved: {retrieved}
category: {source.get("category", "cwit/notice")}
action_required: "Open source and verify exact change"
reliability: {source.get("reliability", 5)}
type: {source.get("type", "cwit-update")}
tags: {yaml_list(tags)}
---
# {title}

## Update Summary
An official monitored page changed. B.R.A.C.E detected a content hash change and created this review note.

## Official Source
{source.get("url", "")}

## Important Dates
- Retrieved: {retrieved}

## Who It Affects
- Review manually. It may affect students, admissions, exams, timetable, placements, or general college information.

## Action Required
- [ ] Open the official source.
- [ ] Identify the exact change.
- [ ] Save important PDFs or screenshots.
- [ ] Add deadlines to [[🔥 Today's Command Center]] if needed.

## Change Hash
- Previous: {old_hash or "first baseline"}
- Current: {new_hash}

## My Notes
- 
"""


def write_note(folder: str, filename: str, body: str) -> Path:
    path = VAULT / folder / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        base = path.stem
        suffix = path.suffix
        counter = 2
        while path.exists():
            path = path.with_name(f"{base} {counter}{suffix}")
            counter += 1
    path.write_text(body, encoding="utf-8")
    return path


def append_raw_link(source_name: str, title: str, url: str, note_path: Path) -> None:
    if not url:
        return
    INBOX_LINKS.parent.mkdir(parents=True, exist_ok=True)
    existing = INBOX_LINKS.read_text(encoding="utf-8", errors="ignore") if INBOX_LINKS.exists() else ""
    if url in existing:
        return
    entry = f"- [ ] {today()} | {source_name} | [{title}]({url}) | note: [[{note_path.stem}]]\n"
    if "## Auto-Captured Links" not in existing:
        with INBOX_LINKS.open("a", encoding="utf-8") as f:
            if existing and not existing.endswith("\n"):
                f.write("\n")
            f.write("\n## Auto-Captured Links\n")
            f.write(entry)
    else:
        with INBOX_LINKS.open("a", encoding="utf-8") as f:
            f.write(entry)


def process_rss(config: dict[str, Any], seen: dict[str, Any], limit_per_feed: int) -> list[Path]:
    created: list[Path] = []
    for source in config.get("rss_sources", []):
        name = source.get("name", source.get("url"))
        try:
            xml_text = fetch(source["url"])
            items = parse_rss(xml_text)
        except Exception as exc:
            log(f"{name}: Update not verified. Source unavailable. Error: {exc}")
            continue

        for item in items[:limit_per_feed]:
            unique = sha256(f"{source.get('name')}|{item.guid}|{item.link}|{item.title}")
            if unique in seen:
                continue
            seen[unique] = {"source": name, "title": item.title, "link": item.link, "seen_at": now_iso()}
            filename = f"{today()} - {slugify(item.title)}.md"
            path = write_note(source.get("target", "01_INBOX"), filename, markdown_for_feed(source, item))
            append_raw_link(str(name), item.title, item.link, path)
            created.append(path)
            log(f"{name}: created {path.relative_to(VAULT)}")
    return created


def process_pages(config: dict[str, Any], hashes: dict[str, Any], baseline_only: bool = False) -> list[Path]:
    created: list[Path] = []
    for source in config.get("page_monitors", []):
        name = source.get("name", source.get("url"))
        url = source["url"]
        try:
            text = strip_html(fetch(url))
        except Exception as exc:
            log(f"{name}: Update not verified. Source unavailable. Error: {exc}")
            continue
        new_hash = sha256(text)
        old_hash = hashes.get(url, {}).get("hash")
        hashes[url] = {"hash": new_hash, "checked_at": now_iso(), "name": name}

        if old_hash is None:
            log(f"{name}: baseline stored")
            continue
        if old_hash != new_hash and not baseline_only:
            filename = f"{today()} - {slugify(name)} changed.md"
            path = write_note(source.get("target", "04_CWIT_COLLEGE_PUNE/Updates"), filename, markdown_for_page_change(source, old_hash, new_hash))
            append_raw_link(str(name), f"{name} changed", url, path)
            created.append(path)
            log(f"{name}: change detected, created {path.relative_to(VAULT)}")
        else:
            log(f"{name}: no change")
    return created


def create_digest(created: list[Path], kind: str = "daily") -> Path | None:
    if not created:
        log(f"{kind.title()} digest skipped: no new items")
        return None
    digest_dir = VAULT / "03_WORLD_INTELLIGENCE" / "Digests"
    digest_dir.mkdir(parents=True, exist_ok=True)
    stamp = today()
    filename = f"{stamp} - B.R.A.C.E {kind.title()} Intelligence Digest.md"
    lines = [
        "---",
        f"date: {stamp}",
        f"type: {kind}-digest",
        "tags: [brace, review, world/news]",
        "---",
        f"# B.R.A.C.E {kind.title()} Intelligence Digest - {stamp}",
        "",
        "## New Items",
    ]
    for path in created:
        lines.append(f"- [[{path.stem}]]")
    lines.extend([
        "",
        "## Manual Review",
        "- [ ] Check high-impact items.",
        "- [ ] Add source notes for anything used in study/project work.",
        "- [ ] Move irrelevant items to archive.",
    ])
    path = digest_dir / filename
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    log(f"Created digest {path.relative_to(VAULT)}")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="B.R.A.C.E Obsidian vault updater")
    parser.add_argument("--once", action="store_true", help="Run RSS and page monitor once")
    parser.add_argument("--baseline-pages", action="store_true", help="Store page hashes without creating change notes")
    parser.add_argument("--limit-per-feed", type=int, default=5)
    parser.add_argument("--weekly", action="store_true", help="Create weekly digest from new items in this run")
    parser.add_argument("--monthly", action="store_true", help="Create monthly digest from new items in this run")
    args = parser.parse_args()

    if not CONFIG.exists():
        print(f"Missing config: {CONFIG}", file=sys.stderr)
        return 2

    STATE_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    config = load_json(CONFIG, {})
    seen = load_json(SEEN_FILE, {})
    hashes = load_json(HASH_FILE, {})

    created: list[Path] = []
    if args.once or not (args.weekly or args.monthly or args.baseline_pages):
        created.extend(process_rss(config, seen, args.limit_per_feed))
        created.extend(process_pages(config, hashes))
        create_digest(created, "daily")
    if args.baseline_pages:
        created.extend(process_pages(config, hashes, baseline_only=True))
    if args.weekly:
        create_digest(created, "weekly")
    if args.monthly:
        create_digest(created, "monthly")

    save_json(SEEN_FILE, seen)
    save_json(HASH_FILE, hashes)
    log("Run complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
