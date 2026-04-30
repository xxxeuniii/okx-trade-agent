@echo off
chcp 65001 >nul
echo ==============================================
echo      Start CryptoSignal AI Agent Service
echo ==============================================
echo.

set "SCRIPT_DIR=%~dp0"
set "AGENT_DIR=%SCRIPT_DIR%agent"

echo Changing to directory: %AGENT_DIR%
cd /d "%AGENT_DIR%"

echo Current Directory: %cd%
echo.

echo Starting Agent Service...
echo Service Address: http://localhost:8000
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause