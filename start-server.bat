@echo off
echo ========================================
echo   FERIWALA BACKEND SERVER
echo ========================================
echo.
echo Starting backend on port 5000...
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
node -r ts-node/register/transpile-only -r tsconfig-paths/register src/index.ts
