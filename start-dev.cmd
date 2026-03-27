@echo off
setlocal

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo [toolbox] npm was not found. Please install Node.js first.
  exit /b 1
)

if not exist node_modules (
  echo [toolbox] node_modules is missing. Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo [toolbox] npm install failed.
    exit /b 1
  )
)

echo [toolbox] Starting the dev server...
echo [toolbox] Vite will print the actual local URL.
call npm.cmd run dev -- --host 127.0.0.1

if errorlevel 1 (
  echo [toolbox] Failed to start the dev server.
  exit /b 1
)
