#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VOICE_ROOT="${BRACE_VOICE_ROOT:-$HOME/.local/share/brace/voice}"
PYTHON="$VOICE_ROOT/.venv/bin/python"
TMP_WAV="$(mktemp --suffix=.wav)"
trap 'rm -f "$TMP_WAV"' EXIT

if [[ ! -x "$PYTHON" ]]; then
  echo "Local voice environment is missing: $PYTHON"
  exit 1
fi

echo "Running real local TTS → STT smoke test..."
BRACE_SMOKE_WAV="$TMP_WAV" "$PYTHON" - <<'PY'
import os
import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel
from kokoro import KPipeline
from openwakeword.model import Model as WakeModel

wav_path = os.environ["BRACE_SMOKE_WAV"]
phrase = "Brace voice system is ready."

pipeline = KPipeline(lang_code="b")
chunks = []
for _graphemes, _phonemes, audio in pipeline(phrase, voice="bm_george", speed=1.02):
    chunks.append(np.asarray(audio, dtype=np.float32))

if not chunks:
    raise RuntimeError("Kokoro produced no audio.")

wave = np.concatenate(chunks)
sf.write(wav_path, wave, 24000)

model = WhisperModel(
    os.environ.get("BRACE_WHISPER_MODEL", "base.en"),
    device="cpu",
    compute_type="int8",
)
segments, _info = model.transcribe(
    wav_path,
    language="en",
    beam_size=1,
    vad_filter=True,
    condition_on_previous_text=False,
)
text = " ".join(segment.text.strip() for segment in segments if segment.text.strip()).strip()

if not text:
    raise RuntimeError("Faster-Whisper returned an empty transcription.")

wake = WakeModel(
    wakeword_models=["hey_jarvis"],
    inference_framework="onnx",
    vad_threshold=0.2,
)
wake_prediction = wake.predict(np.zeros(1280, dtype=np.int16))
if not isinstance(wake_prediction, dict):
    raise RuntimeError("openWakeWord did not return a prediction dictionary.")

print(f"✅ Local voice smoke passed · transcript: {text} · Hey Jarvis model loaded")
PY
