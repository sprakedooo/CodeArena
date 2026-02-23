#!/bin/bash

echo "================================================================"
echo "   CODEARENA - Starting All Servers"
echo "================================================================"
echo ""
echo "Installing dependencies if needed..."
echo ""

# Check if node_modules exists in root
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

# Check if node_modules exists in backend
if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
fi

# Check if node_modules exists in frontend
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "================================================================"
echo "   Starting CodeArena..."
echo "================================================================"
echo ""
echo "   Backend API:  http://localhost:3000"
echo "   Frontend:     http://localhost:8080"
echo ""
echo "   Press Ctrl+C to stop all servers"
echo "================================================================"
echo ""

# Run both servers concurrently
npm start
