#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

version_ge() {
  printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

INSTALL_SKILLS=false
INSTALL_VOICE=true
RUN_SMOKE=true
for arg in "$@"; do
  case "$arg" in
    --skills) INSTALL_SKILLS=true ;;
    --no-voice) INSTALL_VOICE=false ;;
    --skip-smoke) RUN_SMOKE=false ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node 22.6 or newer, then rerun this script."
  exit 1
fi

NODE_VERSION="$(node -p 'process.versions.node')"
if ! version_ge "$NODE_VERSION" "22.6.0"; then
  echo "Node $NODE_VERSION is too old. B.R.A.C.E needs Node 22.6 or newer."
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "Codex CLI was not found."
  echo "Install the current Codex CLI with:"
  echo "  npm install -g @openai/codex@latest"
  echo "Then run:"
  echo "  codex login"
  exit 1
fi

echo "Codex: $(codex --version)"
if ! codex login status >/dev/null 2>&1; then
  echo
  echo "Codex is installed but not signed in."
  echo "Run 'codex login' and sign in with your ChatGPT account, then rerun this script."
  exit 1
fi

echo "Installing B.R.A.C.E dependencies..."
npm ci

chmod +x   scripts/install-kubuntu-autostart.sh   scripts/bootstrap-codex-skills.sh   scripts/setup-local-voice.sh

if [[ "$INSTALL_VOICE" == "true" ]]; then
  echo
  ./scripts/setup-local-voice.sh
else
  echo "Skipping local voice setup (--no-voice)."
fi

echo
echo "Running tests..."
npm test

echo "Building production interface..."
npm run build

if [[ "$RUN_SMOKE" == "true" ]]; then
  echo
  echo "Verifying the real Codex app-server connection..."
  node scripts/smoke-codex.cjs

  if [[ "$INSTALL_VOICE" == "true" ]]; then
    echo
    ./scripts/smoke-local-voice.sh
  fi
else
  echo "Skipping real runtime smoke tests (--skip-smoke)."
fi

./scripts/install-kubuntu-autostart.sh

if [[ "$INSTALL_SKILLS" == "true" ]]; then
  echo
  echo "Installing the optional pinned Codex skill library..."
  ./scripts/bootstrap-codex-skills.sh
else
  echo
  echo "Skipping optional third-party skills."
  echo "To install them later, run: ./scripts/setup-jarvis.sh --skills"
fi

echo
echo "B.R.A.C.E Codex-native setup is complete."
echo
echo "Run:"
echo "  npm run launch"
echo
echo "B.R.A.C.E will use:"
echo "  • your existing Codex / ChatGPT sign-in"
echo "  • local Faster-Whisper speech recognition"
echo "  • local Kokoro text-to-speech"
echo "  • your local Second Brain when you connect its folder"
echo
echo "No OpenAI API key is required by the Codex-native interface."
echo "Re-run the full local verification any time with: ./scripts/verify-brace-local.sh"
echo "On your next KDE login, the prebuilt B.R.A.C.E app will start automatically."
