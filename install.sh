#!/bin/bash
set -euo pipefail

APP_NAME="Lumus Control"
# Nombre del bundle .app dentro del DMG (derivado del productName de Tauri)
APP_BUNDLE="Lumus Control.app"
REPO="dotfn/lumus-control"
# GitHub reemplaza espacios por puntos en los assets del release
DMG_NAME="Lumus.Control"
INSTALL_DIR="/Applications"

# Parse optional --version argument
VERSION=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -v|--version) VERSION="$2"; shift 2 ;;
    --help) echo "Usage: bash <(curl -sL https://raw.githubusercontent.com/$REPO/main/install.sh) [--version <tag>]"; exit 0 ;;
    *) shift ;;
  esac
done

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
  arm64)  ARCH_SUFFIX="aarch64" ;;
  x86_64) echo "Intel Macs (x86_64) are no longer supported. Please build from source or use Apple Silicon."; exit 1 ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

# Try to find a local DMG (when running from the cloned repo after a build)
LOCAL_DMG=""
if [ -d "src-tauri" ] || [ -d "../src-tauri" ]; then
  SEARCH_DIR="."
  [ -d "../src-tauri" ] && SEARCH_DIR=".."
  LOCAL_DMG=$(find "$SEARCH_DIR" -path "*/target/*/bundle/dmg/*.dmg" -maxdepth 6 2>/dev/null | head -1)
fi

# Determine DMG source
if [ -n "$LOCAL_DMG" ] && [ -f "$LOCAL_DMG" ]; then
  DMG_PATH="$LOCAL_DMG"
  echo "Found local build: $DMG_PATH"
else
  echo "No local build found. Downloading from GitHub..."

  # Resolve version
  if [ -z "$VERSION" ]; then
    echo "Fetching latest release..."
    VERSION=$(curl -sL "https://api.github.com/repos/$REPO/releases/latest" | grep tag_name | cut -d'"' -f4)
    if [ -z "$VERSION" ]; then
      echo "Error: Could not fetch latest release." >&2
      exit 1
    fi
    echo "Latest release: $VERSION"
  fi

  DMG_URL="https://github.com/$REPO/releases/download/$VERSION/${DMG_NAME}_${VERSION#v}_${ARCH_SUFFIX}.dmg"
  DMG_PATH="/tmp/${DMG_NAME}_${VERSION#v}_${ARCH_SUFFIX}.dmg"

  echo "Downloading: $DMG_URL"
  curl -# -L -o "$DMG_PATH" "$DMG_URL" || {
    echo "Error: Download failed." >&2
    rm -f "$DMG_PATH"
    exit 1
  }
  echo ""
fi

# Mount DMG
echo "Installing $APP_NAME..."
MOUNT_POINT=$(hdiutil attach -nobrowse "$DMG_PATH" -mount random 2>/dev/null | tail -1 | awk '{print $3}')
if [ -z "$MOUNT_POINT" ]; then
  echo "Error: Failed to mount DMG." >&2
  exit 1
fi

APP_SOURCE="$MOUNT_POINT/$APP_BUNDLE"
if [ ! -d "$APP_SOURCE" ]; then
  echo "Error: $APP_BUNDLE not found in DMG." >&2
  hdiutil detach "$MOUNT_POINT" -quiet
  exit 1
fi

# Remove existing installation
if [ -d "$INSTALL_DIR/$APP_BUNDLE" ]; then
  echo "Removing previous installation..."
  rm -rf "$INSTALL_DIR/$APP_BUNDLE"
fi

# Copy app
echo "Copying to $INSTALL_DIR..."
cp -pR "$APP_SOURCE" "$INSTALL_DIR/"

# Eject DMG
hdiutil detach "$MOUNT_POINT" -quiet

# Remove quarantine attribute (bypasses Gatekeeper)
echo "Removing quarantine attribute..."
xattr -rd com.apple.quarantine "$INSTALL_DIR/$APP_BUNDLE" 2>/dev/null || true

# Cleanup downloaded DMG
if [ -n "${DMG_URL:-}" ]; then
  rm -f "$DMG_PATH"
fi

echo ""
echo "Installation complete!"
echo "Open $APP_NAME from your Applications folder."
