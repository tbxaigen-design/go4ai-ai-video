@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title GO4AI AI Video Studio

echo.
echo  ==========================================
echo    GO4AI AI VIDEO STUDIO
echo    Phien ban: Beta 1.0
echo  ==========================================
echo.

:: -------------------------------------------------------
:: BUOC 1: Xac dinh duong dan Node.js se dung
:: Uu tien: (1) Node portable trong runtime-node\ cua app
::          (2) Node da cai tren may tinh
:: -------------------------------------------------------
set "NODE_EXE="
set "NPM_CMD="

:: Kiem tra Node portable co san trong thu muc app chua
if exist "%~dp0runtime-node\node.exe" (
    set "NODE_EXE=%~dp0runtime-node\node.exe"
    set "NPM_CMD=%~dp0runtime-node\npm.cmd"
    echo [OK] Dang dung Node.js portable cua GO4AI Studio.
    goto :check_deps
)

:: Kiem tra Node.js da cai tren may chua
where node >nul 2>nul
if !errorlevel! equ 0 (
    set "NODE_EXE=node"
    set "NPM_CMD=npm"
    echo [OK] Dang dung Node.js da cai san tren may tinh.
    goto :check_deps
)

:: -------------------------------------------------------
:: Node chua co: Tai Node.js portable v22 LTS (Windows x64)
:: -------------------------------------------------------
echo [*] Khong tim thay Node.js. Dang tai ve tu nodejs.org...
echo [*] Vui long cho trong giay lat (khoang 30-60 giay tuy toc do mang)...
echo.

set "NODE_VERSION=22.14.0"
set "NODE_ZIP=node-v%NODE_VERSION%-win-x64.zip"
set "NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/%NODE_ZIP%"
set "DOWNLOAD_DIR=%~dp0runtime-node"
set "TEMP_ZIP=%TEMP%\go4ai-node.zip"

:: Tao thu muc runtime-node
if not exist "%DOWNLOAD_DIR%" mkdir "%DOWNLOAD_DIR%"

:: Tai Node.js bang curl (co san tren Windows 10+)
curl -L --progress-bar -o "%TEMP_ZIP%" "%NODE_URL%"
if !errorlevel! neq 0 (
    echo.
    echo [LOI] Khong the tai Node.js. Vui long kiem tra ket noi mang.
    echo Hoac tai thu cong tai: https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)

echo [*] Giai nen Node.js portable...
:: Dung PowerShell de giai nen zip
powershell -Command "Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%TEMP%\go4ai-node-extract' -Force"
:: Copy noi dung ra runtime-node\
xcopy /E /I /Y "%TEMP%\go4ai-node-extract\node-v%NODE_VERSION%-win-x64\*" "%DOWNLOAD_DIR%\" >nul
:: Don dep file tam
del "%TEMP_ZIP%" >nul 2>nul
rmdir /S /Q "%TEMP%\go4ai-node-extract" >nul 2>nul

set "NODE_EXE=%DOWNLOAD_DIR%\node.exe"
set "NPM_CMD=%DOWNLOAD_DIR%\npm.cmd"
echo [OK] Da cai dat Node.js portable thanh cong!

:: -------------------------------------------------------
:: BUOC 2: Cai dat thu vien (chi chay lan dau)
:: -------------------------------------------------------
:check_deps
if exist "%~dp0node_modules\remotion" (
    echo [OK] Thu vien da san sang.
    goto :setup_binaries
)

echo [*] Dang cai dat thu vien lan dau (khoang 2-5 phut)...
echo [*] Vui long KHONG tat cua so nay...
echo.

:: BAT BUOC dung pnpm: cac package trong du an lien ket voi nhau bang
:: giao thuc "workspace:*" ma npm KHONG hieu (npm se bao loi
:: "Unsupported URL Type workspace:"). Neu may chua co pnpm thi goi qua
:: npx - cach nay khong can quyen admin, chay duoc ca Windows lan macOS.
set "PNPM_CMD=npx --yes pnpm@9.15.0"
where pnpm >nul 2>nul
if !errorlevel! equ 0 set "PNPM_CMD=pnpm"

!PNPM_CMD! install --frozen-lockfile
if !errorlevel! neq 0 (
    echo.
    echo [LOI] Cai dat thu vien that bai. Kiem tra ket noi mang va chay lai file nay.
    pause
    exit /b 1
)

:: Build packages/cli neu chua co dist
if not exist "%~dp0packages\cli\dist\context.js" (
    echo [*] Dang build module CLI...
    !PNPM_CMD! -r build
    if !errorlevel! neq 0 (
        echo.
        echo [LOI] Build that bai. Vui long chay lai file nay.
        pause
        exit /b 1
    )
)

echo [OK] Thu vien da duoc cai dat!

:: -------------------------------------------------------
:: BUOC 3: Chuan bi FFmpeg + giong doc AI (chi tai lan dau)
:: Khong co FFmpeg thi KHONG xuat duoc video MP4.
:: -------------------------------------------------------
:setup_binaries
"%NODE_EXE%" setup-binaries.js
if !errorlevel! neq 0 (
    echo.
    echo [LOI] Thieu FFmpeg nen khong the xuat video.
    echo Vui long kiem tra ket noi mang va chay lai file nay.
    pause
    exit /b 1
)

:: -------------------------------------------------------
:: BUOC 4: Khoi dong server GO4AI Studio
:: -------------------------------------------------------
:start_server
echo.
echo [*] Dang khoi dong GO4AI AI Video Studio...
echo [*] Trinh duyet se tu dong mo sau vai giay...
echo.
echo  Nhan Ctrl+C de dung server khi khong dung nua.
echo  ==========================================
echo.

"%NODE_EXE%" ui-server.js

if !errorlevel! neq 0 (
    echo.
    echo [Thong bao] Server da dung hoac gap su co.
    pause
)
