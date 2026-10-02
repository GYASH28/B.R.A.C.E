#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"
NODE_DIR="$(dirname "$NODE_BIN")"
BIN_DIR="$HOME/.local/bin"
AUTOSTART_DIR="$HOME/.config/autostart"
LAUNCHER="$BIN_DIR/brace-launch"
DESKTOP_FILE="$AUTOSTART_DIR/brace.desktop"

mkdir -p "$BIN_DIR" "$AUTOSTART_DIR"

cat > "$LAUNCHER" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export PATH="$NODE_DIR:\$PATH"
cd "$APP_DIR"
if [ ! -d node_modules ]; then
  "$NPM_BIN" install
fi
if [ ! -f dist/index.html ]; then
  "$NPM_BIN" run build
fi
exec "$NPM_BIN" run launch
EOF

chmod +x "$LAUNCHER"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=B.R.A.C.E
Comment=Start the BRACE local AI operating layer
Exec=$LAUNCHER
Terminal=false
X-GNOME-Autostart-enabled=true
X-KDE-autostart-after=panel
StartupNotify=false
EOF

echo "B.R.A.C.E autostart installed."
echo "Launcher: $LAUNCHER"
echo "Autostart: $DESKTOP_FILE"
echo "The app will start automatically on your next KDE login."
