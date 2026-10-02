#!/usr/bin/env bash
set -euo pipefail

TMP_DIR="${TMPDIR:-/tmp}/brace-my-codex"
rm -rf "$TMP_DIR"

echo "Fetching the pinned my-codex skill harness (commit 1b608e6)..."
git clone https://github.com/sehoon787/my-codex.git "$TMP_DIR"
cd "$TMP_DIR"
git checkout --detach 1b608e6de668c18504c6e6fe6d6e9cbe32aa9596
cd - >/dev/null

echo "Installing the full skill surface without optional companion tools..."
bash "$TMP_DIR/install.sh" --full-skills --skip-tools --yes

rm -rf "$TMP_DIR"

echo
echo "Skills installed under ~/.codex/skills."
echo "B.R.A.C.E discovers that directory automatically; restart B.R.A.C.E or wait up to 30 seconds for its skill cache to refresh."
