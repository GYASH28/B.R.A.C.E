#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "== B.R.A.C.E local verification =="
echo

echo "[1/4] Unit tests"
npm test

echo
echo "[2/4] Production build"
npm run build

echo
echo "[3/4] Real Codex app-server turn"
node scripts/smoke-codex.cjs

echo
echo "[4/4] Real local voice engine"
./scripts/smoke-local-voice.sh

echo
echo "✅ B.R.A.C.E local verification passed."
