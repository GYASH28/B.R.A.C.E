import asyncio
import re
import threading
import sys
import traceback
from pathlib import Path

try:
    import sounddevice as sd
except (ImportError, OSError):
    sd = None
from google import genai
from google.genai import types
from ui import BraceUI
from services.logging_service import BraceLog, redact
from services.security_service import SecurityService
from config import (
    get_gemini_api_key,
    get_live_model,
    get_response_style,
    get_voice_enabled,
    get_voice_name,
    is_configured,
)
from memory.memory_manager import (
    load_memory, update_memory, format_memory_for_prompt,
)

from actions.file_processor import file_processor
from actions.flight_finder     import flight_finder
from actions.open_app          import open_app
from actions.weather_report    import weather_action
from actions.send_message      import send_message
from actions.reminder          import reminder
from actions.computer_settings import computer_settings
from actions.screen_processor  import screen_process
from actions.youtube_video     import youtube_video
from actions.desktop           import desktop_control
from actions.browser_control   import browser_control
from actions.file_controller   import file_controller
from actions.code_helper       import code_helper
from actions.dev_agent         import dev_agent
from actions.web_search        import web_search as web_search_action
from actions.computer_control  import computer_control
from actions.game_updater      import game_updater
from actions.daily_assistant   import daily_assistant
from actions.media_player      import media_player
from actions.note_taker        import note_taker
from core.tools_config         import TOOL_DECLARATIONS


def get_base_dir():
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent


BASE_DIR            = get_base_dir()
PROMPT_PATH         = BASE_DIR / "core" / "prompt.txt"
LIVE_MODEL          = get_live_model()
CHANNELS            = 1
SEND_SAMPLE_RATE    = 16000
RECEIVE_SAMPLE_RATE = 24000
CHUNK_SIZE          = 1024

def _get_api_key() -> str:
    return get_gemini_api_key()


def _load_system_prompt() -> str:
    try:
        return PROMPT_PATH.read_text(encoding="utf-8")
    except Exception:
        return (
            "You are B.R.A.C.E., the Brain-like Responsive Assistant for Creation and Execution. "
            "Be concise, direct, and always use the provided tools to complete tasks. "
            "Never simulate or guess results; always call the appropriate tool."
        )

_CTRL_RE = re.compile(r"<ctrl\d+>", re.IGNORECASE)

def _clean_transcript(text: str) -> str:    
    text = _CTRL_RE.sub("", text)
    text = re.sub(r"[\x00-\x08\x0b-\x1f]", "", text)
    return text.strip()



