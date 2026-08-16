#!/bin/bash
# GO4AI AI Video Studio — Script cap nhat OTA cho Macbook
cd "$(dirname "$0")"

echo ""
echo " =========================================="
echo "   GO4AI AI VIDEO STUDIO — CAP NHAT"
echo " =========================================="
echo ""
echo "[*] Dang tai ban cap nhat moi nhat tu GitHub..."

REPO_ZIP_URL="https://github.com/tbxaigen-design/go4ai-ai-video/archive/refs/heads/main.zip"
TEMP_ZIP="/tmp/go4ai-update.zip"
TEMP_EXTRACT="/tmp/go4ai-update-extract"
APP_DIR="$(pwd)"

# Tai file zip
curl -L --progress-bar -o "$TEMP_ZIP" "$REPO_ZIP_URL"
if [ $? -ne 0 ]; then
    echo ""
    echo "[LOI] Khong the tai cap nhat. Kiem tra ket noi mang va thu lai."
    read -p "Nhan Enter de dong..."
    exit 1
fi
echo "[OK] Da tai xong!"

# Giai nen
echo "[*] Dang giai nen..."
rm -rf "$TEMP_EXTRACT"
mkdir -p "$TEMP_EXTRACT"
unzip -q "$TEMP_ZIP" -d "$TEMP_EXTRACT"
rm -f "$TEMP_ZIP"

# Tim thu muc con ben trong zip
EXTRACTED_SUBDIR=$(find "$TEMP_EXTRACT" -maxdepth 1 -mindepth 1 -type d | head -1)

if [ -z "$EXTRACTED_SUBDIR" ]; then
    echo "[LOI] Khong doc duoc noi dung ban cap nhat."
    read -p "Nhan Enter de dong..."
    exit 1
fi

# Copy de vao thu muc app (bo qua node_modules, runtime-node, projects, du lieu ca nhan)
echo "[*] Dang ap dung cap nhat..."
rsync -av --progress \
    --exclude="node_modules/" \
    --exclude="runtime-node/" \
    --exclude="projects/" \
    --exclude=".html-video/" \
    --exclude="*.mp4" \
    --exclude="*.wav" \
    --exclude="*.mp3" \
    --exclude=".env" \
    "$EXTRACTED_SUBDIR/" "$APP_DIR/"

# Don dep
rm -rf "$TEMP_EXTRACT"

# Cai lai thu vien neu package.json thay doi
# Phai dung pnpm (giao thuc workspace:* npm khong hieu) — xem chu thich
# trong 1-Chay-Tren-Macbook.command.
echo "[*] Kiem tra va cap nhat thu vien..."
if command -v pnpm &> /dev/null; then
    PNPM_CMD="pnpm"
else
    PNPM_CMD="npx --yes pnpm@9.15.0"
fi

$PNPM_CMD install --frozen-lockfile
if [ $? -ne 0 ]; then
    echo "[LOI] Cai lai thu vien that bai. Vui long thu lai."
    read -p "Nhan Enter de dong..."
    exit 1
fi

# Build lai CLI
echo "[*] Dang build lai..."
$PNPM_CMD -r build
if [ $? -ne 0 ]; then
    echo "[LOI] Build that bai sau khi cap nhat."
    read -p "Nhan Enter de dong..."
    exit 1
fi

# Cap nhat FFmpeg / Chromium / edge-tts neu ban moi can them thu gi
node setup-binaries.js

echo ""
echo " =========================================="
echo "  [OK] Cap nhat hoan tat!"
echo "  Mo lai GO4AI Studio de dung phien ban moi."
echo " =========================================="
echo ""
read -p "Nhan Enter de dong..."
