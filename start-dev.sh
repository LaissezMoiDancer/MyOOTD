#!/bin/bash

echo "Starting MyOOTD Development Servers..."
echo ""

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "[Setup] Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "[Setup] Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies if needed
if [ ! -f "venv/.installed" ]; then
    echo "[Setup] Installing Python dependencies..."
    pip install -r requirements.txt
    touch venv/.installed
fi

# Start backend in background
echo "[1/2] Starting Python Backend Server..."
uvicorn outfit_generator:app --reload --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "[Setup] Installing Node.js dependencies..."
    npm install
fi

# Start frontend
echo "[2/2] Starting Frontend Development Server..."
echo ""
echo "=========================================="
echo "Backend: http://127.0.0.1:8000"
echo "Frontend: http://localhost:3000"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop both servers"

# Trap Ctrl+C to kill both processes
trap "kill $BACKEND_PID 2>/dev/null; exit" INT TERM

npm run dev

# Cleanup on exit
kill $BACKEND_PID 2>/dev/null
