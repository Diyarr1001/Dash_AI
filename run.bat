@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo           DASH AI - STARTUP WIZARD
echo ============================================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it to run the frontend.
    pause
    exit /b
)

:: Check for Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed. Please install it to run the backend.
    pause
    exit /b
)

echo [1/3] Preparing Backend...
cd backend
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing/Updating backend dependencies...
pip install -r requirements.txt
start "Dash AI - Backend" cmd /k "call venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
cd ..

echo [2/3] Preparing Frontend...
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)
start "Dash AI - Frontend" cmd /k "npm run dev"
cd ..

echo [3/3] Launching Dash AI...
echo.
echo Dash AI is starting!
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo [INFO] Press any key to stop the startup script (servers will keep running in their windows).
pause >nul
