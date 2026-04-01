@echo off
title Julie Creations - Lancement
color 0B
cls
echo.
echo  ============================================
echo    JULIE CREATIONS  - Demarrage complet
echo  ============================================
echo.

:: --- BACKEND FastAPI (port 8001) ---
echo  [1/2] Backend FastAPI  ^> http://localhost:8001
start "Julie - Backend" cmd /k "cd /d C:\Tricot-Julie\backend && set PYTHONPATH=C:\Tricot-Julie\backend && venv\Scripts\uvicorn.exe server:app --host 0.0.0.0 --port 8001 --reload"

echo  Attente demarrage backend...
timeout /t 4 /nobreak >nul

:: --- FRONTEND Expo Web (port 8082) ---
echo  [2/2] Frontend Expo   ^> http://localhost:8082
start "Julie - Frontend" cmd /k "cd /d C:\Tricot-Julie\frontend && node_modules\.bin\expo.cmd start --web --port 8082"

echo.
timeout /t 3 /nobreak >nul

:: --- Ouvrir le navigateur ---
start "" "http://localhost:8082"

echo.
echo  ============================================
echo    Tout est lance !
echo.
echo    Frontend  : http://localhost:8082
echo    API Docs  : http://localhost:8001/docs
echo    API Sante : http://localhost:8001/api/health
echo  ============================================
echo.
echo  Fermer cette fenetre ne coupe pas l'appli.
echo  Fermer les fenetres "Backend" et "Frontend"
echo  pour tout couper.
echo.
pause
