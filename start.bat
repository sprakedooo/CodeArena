@echo off
echo ================================================================
echo    CODEARENA - Starting All Servers
echo ================================================================
echo.
echo Installing dependencies if needed...
echo.

:: Check if node_modules exists in root
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
)

:: Check if node_modules exists in backend
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

:: Check if node_modules exists in frontend
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo ================================================================
echo    Starting CodeArena...
echo ================================================================
echo.
echo    Backend API:  http://localhost:3000
echo    Frontend:     http://localhost:8080
echo.
echo    Press Ctrl+C to stop all servers
echo ================================================================
echo.

:: Install all dependencies first (safe to run even if already installed)
call npm run install-all

:: Run both servers concurrently
npm start
pause
