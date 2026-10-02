#!/usr/bin/env bash
set -euo pipefail

VOICE_ROOT="${BRACE_VOICE_ROOT:-$HOME/.local/share/brace/voice}"
VENV="$VOICE_ROOT/.venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Python 3 is required for local B.R.A.C.E voice."
  exit 1
fi

need_apt=()
command -v espeak-ng >/dev/null 2>&1 || need_apt+=(espeak-ng)

if command -v dpkg-query >/dev/null 2>&1; then
  dpkg-query -W -f='${Status}' python3-venv 2>/dev/null | grep -q "install ok installed" || need_apt+=(python3-venv)
elif ! "$PYTHON_BIN" -c 'import ensurepip' >/dev/null 2>&1; then
  need_apt+=(python3-venv)
fi

if (("${#need_apt[@]}" > 0)); then
  echo "Installing local voice system dependencies: ${need_apt[*]}"
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y "${need_apt[@]}"
  else
    echo "Please install these packages with your system package manager: ${need_apt[*]}"
    exit 1
  fi
fi

mkdir -p "$VOICE_ROOT"

if [[ ! -x "$VENV/bin/python" ]]; then
  echo "Creating isolated B.R.A.C.E voice environment..."
  "$PYTHON_BIN" -m venv "$VENV"
fi

echo "Updating pip..."
"$VENV/bin/python" -m pip install --upgrade pip wheel setuptools

echo "Installing Faster-Whisper + Kokoro local voice..."
"$VENV/bin/python" -m pip install \
  "faster-whisper>=1.2.0" \
  "kokoro>=0.9.4" \
  "soundfile>=0.12.1" \
  "numpy>=1.26" \
  "misaki[en]"

echo
echo "Local voice environment ready:"
echo "  Python: $VENV/bin/python"
echo "  STT: Faster-Whisper (CPU INT8)"
echo "  TTS: Kokoro 82M"
echo "  Default B.R.A.C.E voice: bm_george"
echo
echo "The first warm-up may download model weights."
