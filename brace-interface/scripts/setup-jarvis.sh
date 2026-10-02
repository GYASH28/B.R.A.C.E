#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

version_ge() {
  printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node 22.6 or newer, then rerun this script."
  exit 1
fi

NODE_VERSION="$(node -p 'process.versions.node')"
if ! version_ge "$NODE_VERSION" "22.6.0"; then
  echo "Node $NODE_VERSION is too old. B.R.A.C.E GPT-Live needs Node 22.6 or newer."
  exit 1
fi

echo "Installing B.R.A.C.E dependencies..."
npm ci

echo "Running tests..."
npm test

echo "Building production interface..."
npm run build

chmod +x scripts/install-kubuntu-autostart.sh scripts/bootstrap-codex-skills.sh
./scripts/install-kubuntu-autostart.sh

if [[ "${1:-}" == "--skills" ]]; then
  echo
  echo "Installing the optional pinned Codex skill library..."
  ./scripts/bootstrap-codex-skills.sh
else
  echo
  echo "Skipping optional third-party skills."
  echo "To install them later, run: ./scripts/setup-jarvis.sh --skills"
fi

echo
echo "B.R.A.C.E is prepared for Kubuntu startup."
echo "Next:"
echo "  1. Run: npm run launch"
echo "  2. Open Settings inside B.R.A.C.E and save your OpenAI API key."
echo "  3. Enable Microphone and AI model permissions."
echo "  4. Keep GPT-Live-1 / Online High Quality enabled."
echo
echo "On your next KDE login, B.R.A.C.E will launch automatically from localhost."
