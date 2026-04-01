@echo off
title Julie Tricot - Lancement
color 0A
echo.
echo ================================================
echo   JULIE CREATIONS - Demarrage de l'application
echo ================================================
echo.

:: Lancer le backend FastAPI
echo [1/2] Demarrage du backend (port 8001)...
start "Julie - Backend" cmd /c "cd /d C:\Tricot-Julie\backend && venv\Scripts\uvicorn.exe server:app --host 0.0.0.0 --port 8001"

timeout /t 3 /nobreak >nul

:: Lancer le frontend Expo
echo [2/2] Demarrage du frontend Expo (port 8082)...
start "Julie - Frontend" cmd /c "cd /d C:\Tricot-Julie\frontend && node_modules\.bin\expo.cmd start --web --port 8082"

echo.
echo ================================================
echo   Application lancee !
echo   Backend  : http://localhost:8001/docs
echo   Frontend : http://localhost:8082
echo   Mobile   : Scanner le QR code dans Expo Go
echo ================================================
echo.
pause
