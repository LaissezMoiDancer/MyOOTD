@echo off
echo Starting MyOOTD Development Servers...
echo.

echo [1/2] Starting Python Backend Server...
start "MyOOTD Backend" cmd /k "python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && uvicorn outfit_generator:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Development Server...
start "MyOOTD Frontend" cmd /k "npm install && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this window (servers will continue running)...
pause >nul
