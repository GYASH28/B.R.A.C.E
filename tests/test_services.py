from __future__ import annotations

import unittest
from datetime import datetime
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from actions.daily_assistant import current_date_text, current_time_text, daily_assistant, greeting_for_hour
from actions.media_player import media_player
from actions.note_taker import note_taker
from integrations.mcp.mcp_config import McpConfig
from providers.provider_manager import ProviderManager
from services.legacy_speech_service import LegacySpeechService
from services.logging_service import mask_secret, redact
from services.security_service import SafetyLevel, SecurityService


class SecurityServiceTests(unittest.TestCase):
    def test_file_delete_requires_confirmation(self):
        decision = SecurityService(safe_mode=True).evaluate_tool("file_controller", {"action": "delete", "path": "desktop"})
        self.assertFalse(decision.allowed)
        self.assertEqual(decision.level, SafetyLevel.CONFIRMATION)

    def test_safe_weather_action_allowed(self):
        decision = SecurityService(safe_mode=True).evaluate_tool("weather_report", {"city": "Delhi"})
        self.assertTrue(decision.allowed)

    def test_confirmed_risky_action_allowed(self):
        decision = SecurityService(safe_mode=True).evaluate_tool("send_message", {"receiver": "Alex", "message_text": "Hi", "confirmed": "yes"})
        self.assertTrue(decision.allowed)

    def test_media_play_requires_confirmation(self):
        decision = SecurityService(safe_mode=True).evaluate_tool("media_player", {"action": "play"})
        self.assertFalse(decision.allowed)
        self.assertEqual(decision.level, SafetyLevel.CONFIRMATION)

    def test_note_default_write_allowed(self):
        decision = SecurityService(safe_mode=True).evaluate_tool("note_taker", {"action": "write", "title": "x"})
        self.assertTrue(decision.allowed)

    def test_note_custom_path_requires_confirmation(self):
        decision = SecurityService(safe_mode=True).evaluate_tool("note_taker", {"action": "write", "path": "C:/Temp/brace_note.txt"})
        self.assertFalse(decision.allowed)
        self.assertEqual(decision.level, SafetyLevel.CONFIRMATION)


class LoggingTests(unittest.TestCase):
    def test_mask_secret(self):
        self.assertEqual(mask_secret("1234567890abcdef"), "1234...cdef")

    def test_redact_gemini_key_pattern(self):
        self.assertIn("[redacted]", redact("GEMINI_API_KEY=AIzaabcdefghijklmnopqrstuvwxyz"))


class McpConfigTests(unittest.TestCase):
    def test_default_mcp_config_validates(self):
        result = McpConfig().validate()
        self.assertTrue(result.ok, result.message)


class ProviderManagerTests(unittest.TestCase):
    def test_provider_statuses_exist(self):
        names = {status.name for status in ProviderManager().statuses()}
        self.assertIn("gemini", names)
        self.assertIn("nvidia", names)
        self.assertIn("local", names)


class DailyAssistantTests(unittest.TestCase):
    def test_time_and_date_formatting(self):
        now = datetime(2026, 5, 22, 17, 4, 3)
        self.assertEqual(current_time_text(now), "The current time is 05:04:03 PM.")
        self.assertEqual(current_date_text(now), "Today is Friday, May 22, 2026.")

    def test_greeting_formatting(self):
        self.assertIn("Good morning", greeting_for_hour(9, "Test Assistant"))

    def test_name_persistence_round_trip(self):
        from services.settings_service import SETTINGS_PATH

        original = SETTINGS_PATH.read_text(encoding="utf-8") if SETTINGS_PATH.exists() else ""
        try:
            result = daily_assistant({"action": "set_name", "name": "Jarvis Test"})
            self.assertIn("Jarvis Test", result)
            from services.settings_service import SettingsService
            self.assertEqual(SettingsService().get("assistant_name"), "Jarvis Test")
        finally:
            if original:
                SETTINGS_PATH.write_text(original, encoding="utf-8")

    def test_wikipedia_missing_package_is_graceful(self):
        real_import = __import__

        def fake_import(name, *args, **kwargs):
            if name == "wikipedia":
                raise ImportError("missing wiki")
            return real_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=fake_import):
            result = daily_assistant({"action": "wikipedia", "query": "Alan Turing"})
        self.assertIn("Wikipedia support is not available", result)

    def test_joke_missing_package_is_graceful(self):
        real_import = __import__

        def fake_import(name, *args, **kwargs):
            if name == "pyjokes":
                raise ImportError("missing jokes")
            return real_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=fake_import):
            result = daily_assistant({"action": "joke"})
        self.assertIn("Joke support is not available", result)


class JarvisActionTests(unittest.TestCase):
    def test_music_search_and_list(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "song_one.mp3").write_bytes(b"fake")
            (root / "notes.txt").write_text("not audio", encoding="utf-8")
            listed = media_player({"action": "list", "music_dir": str(root)})
            self.assertIn("song_one.mp3", listed)
            searched = media_player({"action": "search", "query": "one", "music_dir": str(root)})
            self.assertIn("song_one.mp3", searched)

    def test_note_create_read_search(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            saved = note_taker({"action": "create", "title": "meeting", "content": "Attend meeting at 10", "notes_dir": str(root)})
            self.assertIn("Saved note", saved)
            read = note_taker({"action": "read", "title": "meeting", "notes_dir": str(root)})
            self.assertIn("Attend meeting", read)
            found = note_taker({"action": "search", "query": "meeting", "notes_dir": str(root)})
            self.assertIn("meeting.txt", found)


class LegacySpeechTests(unittest.TestCase):
    def test_status_never_raises(self):
        status = LegacySpeechService().status()
        self.assertIn("pyttsx3=", status.detail)


if __name__ == "__main__":
    unittest.main()
