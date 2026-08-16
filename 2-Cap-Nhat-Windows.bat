@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title GO4AI - Cap nhat phien ban moi

echo.
echo  ==========================================
echo    GO4AI AI VIDEO STUDIO — CAP NHAT
echo  ==========================================
echo.
echo [*] Dang kiem tra va tai ban cap nhat moi nhat tu GitHub...
echo.

set "REPO_ZIP_URL=https://github.com/tbxaigen-design/go4ai-ai-video/archive/refs/heads/main.zip"
set "TEMP_ZIP=%TEMP%\go4ai-update.zip"
set "TEMP_EXTRACT=%TEMP%\go4ai-update-extract"
set "APP_DIR=%~dp0"

:: Tai file zip ban moi nhat tu GitHub
echo [*] Dang tai ban cap nhat (vui long cho)...
curl -L --progress-bar -o "%TEMP_ZIP%" "%REPO_ZIP_URL%"
if !errorlevel! neq 0 (
    echo.
    echo [LOI] Khong the tai cap nhat. Kiem tra ket noi mang va thu lai.
    pause
    exit /b 1
)
echo [OK] Da tai xong!

:: Giai nen vao thu muc tam
echo [*] Dang giai nen...
if exist "%TEMP_EXTRACT%" rmdir /S /Q "%TEMP_EXTRACT%"
powershell -Command "Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%TEMP_EXTRACT%' -Force"
del "%TEMP_ZIP%" >nul 2>nul

:: Tim thu muc con ben trong zip (GitHub tao: go4ai-ai-video-main\)
set "EXTRACTED_SUBDIR="
for /D %%d in ("%TEMP_EXTRACT%\*") do set "EXTRACTED_SUBDIR=%%d"

if not defined EXTRACTED_SUBDIR (
    echo [LOI] Khong doc duoc noi dung ban cap nhat.
    pause
    exit /b 1
)

:: Copy de cac file source (bo qua du lieu ca nhan va thu vien)
echo [*] Dang ap dung cap nhat...
xcopy /E /I /Y /EXCLUDE:"%~dp0update-exclude.txt" "%EXTRACTED_SUBDIR%\*" "%APP_DIR%\" >nul 2>nul

:: Don dep
rmdir /S /Q "%TEMP_EXTRACT%" >nul 2>nul

:: Cai lai thu vien neu package.json thay doi.
:: Phai dung pnpm (giao thuc workspace:* npm khong hieu) — xem chu thich
:: trong 1-Chay-Tren-Windows.bat.
echo [*] Kiem tra thu vien...
set "PNPM_CMD=npx --yes pnpm@9.15.0"
where pnpm >nul 2>nul
if !errorlevel! equ 0 set "PNPM_CMD=pnpm"

!PNPM_CMD! install --frozen-lockfile
if !errorlevel! neq 0 (
    echo [LOI] Cai lai thu vien that bai. Vui long chay lai file nay.
    pause
    exit /b 1
)

:: Build lai CLI
echo [*] Dang build lai...
!PNPM_CMD! -r build
if !errorlevel! neq 0 (
    echo [LOI] Build that bai sau khi cap nhat.
    pause
    exit /b 1
)

:: Cap nhat FFmpeg / Chromium / edge-tts neu ban moi can them thu gi
node setup-binaries.js

echo.
echo  ==========================================
echo   [OK] Cap nhat hoan tat!
echo   Mo lai GO4AI Studio de dung phien ban moi.
echo  ==========================================
echo.
pause
