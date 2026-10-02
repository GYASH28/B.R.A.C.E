#!/usr/bin/env bash
set -euo pipefail

TMP_DIR="${TMPDIR:-/tmp}/brace-my-codex"
rm -rf "$TMP_DIR"

echo "Fetching the my-codex skill harness..."
git clone --depth 1 https://github.com/sehoon787/my-codex.git "$TMP_DIR"

echo "Installing the full skill surface without optional companion tools..."
bash "$TMP_DIR/install.sh" --full-skills --skip-tools --yes

rm -rf "$TMP_DIR"

echo
echo "Skills installed under ~/.codex/skills."
echo "B.R.A.C.E discovers that directory automatically; restart B.R.A.C.E or wait up to 30 seconds for its skill cache to refresh."
