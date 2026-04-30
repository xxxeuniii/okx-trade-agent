@echo off
chcp 65001 >nul
echo ==============================================
echo      Start CryptoSignal AI Backend Service
echo ==============================================
echo.

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"

echo Changing to directory: %BACKEND_DIR%
cd /d "%BACKEND_DIR%"

echo Current Directory: %cd%
echo.

echo Starting Backend Service...
echo Service Address: http://localhost:8080
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload

pause