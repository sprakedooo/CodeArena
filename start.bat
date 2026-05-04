@echo off
echo ================================================================
echo    CODEARENA - Starting All Servers
echo ================================================================
echo.

:: Install backend dependencies if needed
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

:: Install frontend dependencies if needed
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo    Backend API:  http://localhost:3000
echo    Frontend:     http://localhost:3001
echo.
echo    Close either window to stop that server.
echo ================================================================
echo.

:: Open backend in a new window
start "CodeArena Backend" cmd /k "cd /d %~dp0backend && npm start"

:: Open frontend in a new window
start "CodeArena Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo Both servers started in separate windows.
echo You can close this window.
pause
