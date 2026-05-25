from __future__ import annotations

import importlib.util
from dataclasses import dataclass

import numpy as np

from services.settings_service import SettingsService, env_bool


@dataclass
class LegacySpeechStatus:
    tts_available: bool
    stt_available: bool
    detail: str


class LegacySpeechService:
    def __init__(self):
        settings = SettingsService()
        self.tts_enabled = env_bool("BRACE_LEGACY_VOICE_ENABLED", bool(settings.get("legacy_voice_enabled", False)))
        self.stt_enabled = env_bool("BRACE_LEGACY_STT_ENABLED", bool(settings.get("legacy_stt_enabled", False)))

    def status(self) -> LegacySpeechStatus:
        pyttsx3_ok = importlib.util.find_spec("pyttsx3") is not None
        sr_ok = importlib.util.find_spec("speech_recognition") is not None
        details = [
            f"pyttsx3={'installed' if pyttsx3_ok else 'missing'}",
            f"SpeechRecognition={'installed' if sr_ok else 'missing'}",
            f"tts_enabled={self.tts_enabled}",
            f"stt_enabled={self.stt_enabled}",
        ]
        return LegacySpeechStatus(pyttsx3_ok, sr_ok, ", ".join(details))

    def speak(self, text: str) -> str:
        if not self.tts_enabled:
            return "Legacy TTS is disabled."
        try:
            import pyttsx3
            engine = pyttsx3.init()
            engine.say(text)
            engine.runAndWait()
            return "Spoken through legacy TTS."
        except Exception as exc:
            return f"Legacy TTS failed: {exc}"

    def listen_once(self, seconds: float = 4.0, language: str = "en-in") -> str:
        if not self.stt_enabled:
            return "Legacy STT is disabled."
        try:
            import speech_recognition as sr
        except Exception as exc:
            return f"SpeechRecognition is not available: {exc}"

        recognizer = sr.Recognizer()
        try:
            import sounddevice as sd

            sample_rate = 16000
            frames = int(sample_rate * max(1.0, min(seconds, 8.0)))
            audio = sd.rec(frames, samplerate=sample_rate, channels=1, dtype="int16")
            sd.wait()
            pcm = np.asarray(audio, dtype=np.int16).tobytes()
            data = sr.AudioData(pcm, sample_rate, 2)
            return recognizer.recognize_google(data, language=language)
        except Exception as exc:
            return f"Legacy STT failed: {exc}"
