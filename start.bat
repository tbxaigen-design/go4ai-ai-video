@echo off
setlocal
cd /d "%~dp0"
title GO4AI HTML to Video Studio

echo ======================================================
echo    GO4AI HTML TO VIDEO STUDIO
echo ======================================================
echo.
echo [*] Kiem tra moi truong Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Node.js trong he thong!
    echo Vui long cai dat Node.js tai https://nodejs.org de su dung.
    echo.
    pause
    exit /b 1
)

echo [*] Dang khoi dong Server tai http://localhost:3075 ...
echo [*] Trinh duyet web se tu dong mo trong giay lat...
echo.

node ui-server.js

if %errorlevel% neq 0 (
    echo.
    echo [Thong bao] Server da dung hoac gap su co.
    pause
)
