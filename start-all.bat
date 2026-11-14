@echo off
title PolyMind Launcher
echo ============================================================
echo Starting PolyMind (Backend + Frontend + Embedded SQLite)
echo ============================================================

start "PolyMind Backend (FastAPI)" cmd /k "cd /d "%~dp0apps\api" && .venv\Scripts\python.exe -m uvicorn app.main:app --app-dir apps\api --reload --port 8000"

timeout /t 2 /nobreak >nul

start "PolyMind Frontend (Next.js)" cmd /k "cd /d "%~dp0apps\web" && npm run dev"

echo.
echo Backend API:  http://127.0.0.1:8000
echo Frontend UI:  http://localhost:3000
echo Database:     apps\api\data\app.db (Embedded SQLite - no extra install needed)
echo.
pause
