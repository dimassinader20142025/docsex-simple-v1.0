@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Python virtual environment not found.
  echo Run install.ps1 first.
  pause
  exit /b 1
)

echo Starting Docsexprime AI on http://127.0.0.1:8080
echo.
echo Keep this window open while using the site.
echo Press Ctrl+C to stop the server.
echo.

".venv\Scripts\python.exe" -m uvicorn server:app --host 127.0.0.1 --port 8080

echo.
echo Server stopped.
pause
