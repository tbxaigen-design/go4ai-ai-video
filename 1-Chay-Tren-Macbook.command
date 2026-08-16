#!/bin/bash
# GO4AI AI Video Studio — Script khoi dong cho Macbook (macOS)
# Cach dung: Click chuot phai vao file nay → Chon "Mo" (Open) → Bam "Mo" (Open)

# Chuyen vao thu muc chua script nay
cd "$(dirname "$0")"

echo ""
echo " =========================================="
echo "   GO4AI AI VIDEO STUDIO"
echo "   Phien ban: Beta 1.0"
echo " =========================================="
echo ""

# -------------------------------------------------------
# BUOC 1: Kiem tra Node.js co san chua
# -------------------------------------------------------
NODE_EXE=""

# Uu tien Node portable trong thu muc app (neu co)
if [ -f "./runtime-node/bin/node" ]; then
    NODE_EXE="./runtime-node/bin/node"
    NPM_CMD="./runtime-node/bin/npm"
    echo "[OK] Dang dung Node.js portable cua GO4AI Studio."
elif command -v node &> /dev/null; then
    NODE_EXE="node"
    NPM_CMD="npm"
    NODE_VER=$(node --version)
    echo "[OK] Dang dung Node.js $NODE_VER da cai san tren may."
else
    # Node chua co — hien huong dan cai dat
    echo ""
    echo "========================================================"
    echo "  [THONG BAO] May Macbook chua cai Node.js."
    echo "========================================================"
    echo ""
    echo "  Vui long cai Node.js theo 1 trong 2 cach sau:"
    echo ""
    echo "  CACH 1 (De nhat): Tai file cai dat .pkg tu website chinh thuc:"
    echo "  → Dang mo trang web tai Node.js..."
    echo ""
    open "https://nodejs.org/en/download"
    echo "  CACH 2 (Neu co Homebrew): Mo Terminal va chay lenh:"
    echo "     brew install node"
    echo ""
    echo "  Sau khi cai xong, nhap doi vao file nay de khoi dong lai."
    echo ""
    read -p "  Nhan Enter de dong cua so nay..."
    exit 1
fi

# Kiem tra phien ban Node >= 20
NODE_MAJOR=$($NODE_EXE --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ] 2>/dev/null; then
    echo ""
    echo "[CANH BAO] Go4AI Studio can Node.js phien ban 20 tro len."
    echo "Phien ban hien tai cua ban: $($NODE_EXE --version)"
    echo "Vui long cap nhat Node.js tai: https://nodejs.org/en/download"
    echo ""
    open "https://nodejs.org/en/download"
    read -p "Nhan Enter de dong..."
    exit 1
fi

# -------------------------------------------------------
# BUOC 2: Cai dat thu vien (chi chay lan dau)
# -------------------------------------------------------
# BAT BUOC dung pnpm: cac package trong du an lien ket voi nhau bang giao thuc
# "workspace:*" ma npm KHONG hieu (npm bao loi "Unsupported URL Type workspace:").
# Neu may chua co pnpm thi goi qua npx — khong can sudo, khong cai global.
if command -v pnpm &> /dev/null; then
    PNPM_CMD="pnpm"
else
    PNPM_CMD="npx --yes pnpm@9.15.0"
fi

if [ ! -d "./node_modules/remotion" ]; then
    echo "[*] Dang cai dat thu vien lan dau (khoang 2-5 phut)..."
    echo "[*] Vui long KHONG tat cua so nay..."
    echo ""

    $PNPM_CMD install --frozen-lockfile
    if [ $? -ne 0 ]; then
        echo ""
        echo "[LOI] Cai dat thu vien that bai. Kiem tra ket noi mang va thu lai."
        read -p "Nhan Enter de dong..."
        exit 1
    fi

    echo "[OK] Thu vien da duoc cai dat!"
fi

# Build CLI neu chua co (nam ngoai khoi tren de lan chay sau van duoc kiem tra)
if [ ! -f "./packages/cli/dist/context.js" ]; then
    echo "[*] Dang build module CLI..."
    $PNPM_CMD -r build
    if [ $? -ne 0 ]; then
        echo ""
        echo "[LOI] Build that bai. Vui long thu lai."
        read -p "Nhan Enter de dong..."
        exit 1
    fi
fi

# -------------------------------------------------------
# BUOC 3: Chuan bi FFmpeg + giong doc AI (chi tai lan dau)
# Khong co FFmpeg thi KHONG xuat duoc video MP4.
# Nam NGOAI khoi cai thu vien o tren, de lan chay thu 2 tro di van duoc kiem tra.
# -------------------------------------------------------
$NODE_EXE setup-binaries.js
if [ $? -ne 0 ]; then
    echo ""
    echo "[LOI] Thieu FFmpeg nen khong the xuat video."
    echo "Vui long kiem tra ket noi mang va chay lai file nay."
    read -p "Nhan Enter de dong..."
    exit 1
fi

# -------------------------------------------------------
# BUOC 4: Khoi dong server GO4AI Studio
# -------------------------------------------------------
echo ""
echo "[*] Dang khoi dong GO4AI AI Video Studio..."
echo "[*] Trinh duyet se tu dong mo sau vai giay..."
echo ""
echo "  Nhan Ctrl+C de dung server khi khong dung nua."
echo " =========================================="
echo ""

$NODE_EXE ui-server.js
