@echo off
echo ==========================================
echo   BOM Manager - Local Dev Environment
echo ==========================================

echo.
echo [1/3] Installing dependencies...
call npm install

echo.
echo [2/3] Syncing database schema...
call npx prisma db push

echo.
echo [3/3] Starting development server...
echo Access the app at: http://localhost:3000
echo.
npm run dev
