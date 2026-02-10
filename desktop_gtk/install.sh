#!/bin/bash
set -e

APP_NAME="dlm-gtk"
APP_ID="com.brettchalupa.dlm"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"

echo "Building release binary..."
cargo build --release

echo "Installing binary to $BIN_DIR..."
mkdir -p "$BIN_DIR"
cp target/release/$APP_NAME "$BIN_DIR/"
chmod +x "$BIN_DIR/$APP_NAME"

echo "Creating desktop entry..."
mkdir -p "$DESKTOP_DIR"
cat >"$DESKTOP_DIR/$APP_ID.desktop" <<EOF
[Desktop Entry]
Name=DLM
Comment=Download Manager desktop client
Exec=$BIN_DIR/$APP_NAME
Icon=folder-download-symbolic
Terminal=false
Type=Application
Categories=Network;FileTransfer;
EOF

echo "Updating desktop database..."
update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true

echo ""
echo "Installation complete!"
echo "  Binary: $BIN_DIR/$APP_NAME"
echo "  Desktop: $DESKTOP_DIR/$APP_ID.desktop"
echo ""
echo "Make sure $BIN_DIR is in your PATH."
