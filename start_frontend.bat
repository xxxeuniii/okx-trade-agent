@echo off
chcp 65001 >nul
echo ==============================================
echo      Start CryptoSignal AI Frontend Service
echo ==============================================
echo.

set "SCRIPT_DIR=%~dp0"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"

echo Changing to directory: %FRONTEND_DIR%
cd /d "%FRONTEND_DIR%"

echo Current Directory: %cd%
echo.

echo Starting Frontend Service...
echo Service Address: http://localhost:3000
echo.

npm run dev

pause