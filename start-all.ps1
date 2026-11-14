Write-Host "Starting PolyMind..." -ForegroundColor Cyan

# 1. Start FastAPI Backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot/apps/api'; Write-Host 'Starting Backend API on http://127.0.0.1:8000...' -ForegroundColor Green; .\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir apps/api --reload --port 8000"

Start-Sleep -Seconds 2

# 2. Start Next.js Frontend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot/apps/web'; Write-Host 'Starting Frontend on http://localhost:3000...' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "Both servers launched!" -ForegroundColor Green
Write-Host "Backend API:  http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host "Frontend Web: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Database:     Embedded SQLite at apps/api/data/app.db (zero-config, runs automatically)" -ForegroundColor Gray
