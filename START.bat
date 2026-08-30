@echo off
title Julie Creations - Lancement
color 0B
cls
echo.
echo  ============================================
echo    JULIE CREATIONS  - Demarrage complet
echo  ============================================
echo.

set PROJECT_DIR=%~dp0

:: --- MongoDB Docker (si pas deja lance) ---
echo  [0/3] Verification MongoDB Docker...
docker ps --filter "name=julie-mongo" --format "{{.Names}}" 2>nul | findstr julie-mongo >nul
if errorlevel 1 (
    echo  Demarrage MongoDB Docker...
    docker run -d --name julie-mongo -p 27017:27017 mongo:7 2>nul || docker start julie-mongo 2>nul
    timeout /t 3 /nobreak >nul
) else (
    echo  MongoDB deja en cours.
)

:: --- BACKEND FastAPI (port 8001) ---
echo  [1/2] Backend FastAPI  ^> http://localhost:8001
start "Julie - Backend" cmd /k "cd /d %PROJECT_DIR%backend && python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload"

echo  Attente demarrage backend...
timeout /t 4 /nobreak >nul

:: --- FRONTEND Expo Web (port 8002) ---
echo  [2/2] Frontend Expo   ^> http://localhost:8002
start "Julie - Frontend" cmd /k "cd /d %PROJECT_DIR%frontend && npx expo start --web --port 8002"

echo.
timeout /t 8 /nobreak >nul

:: --- Ouvrir le navigateur ---
start "" "http://localhost:8002"

echo.
echo  ============================================
echo    Tout est lance !
echo.
echo    Frontend  : http://localhost:8002
echo    API Docs  : http://localhost:8001/docs
echo    API Sante : http://localhost:8001/api/health
echo    Admin MDP : JulieCreations2026!
echo  ============================================
echo.
echo  Fermer cette fenetre ne coupe pas l'appli.
echo  Fermer les fenetres "Backend" et "Frontend"
echo  pour tout couper.
echo.
pause
