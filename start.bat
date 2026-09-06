@echo off
REM Build + Run Global Media in production mode (Windows)
echo Starting Global Media...
cd /d "%~dp0server"
if not exist ".env" (
  echo Copying .env.example to .env...
  copy .env.example .env
  echo Edit .env to set GOOGLE_CLIENT_ID etc. then restart.
)
if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
)
echo Building done. Starting server on http://localhost:3000
echo LAN: http://192.168.31.154:3000
echo Press Ctrl+C to stop. Use start.vbs for background.
node server.js
