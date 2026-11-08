@echo off
title Airship Autonomous Mobile & Web Release Engine
echo ============================================================================
echo   AIRSHIP AUTONOMOUS MOBILE ^& WEB RELEASE ENGINE
echo   API Server:       http://127.0.0.1:4000
echo   Cockpit UI:       http://localhost:5173
echo ============================================================================

start "Airship API Server (Port 4000)" /D "E:\.genieflowai.brain\03_APPS\airship\apps\api" cmd /k "node dist/server.js"
timeout /t 2 /nobreak >nul
start "Airship Cockpit UI (Port 5173)" /D "E:\.genieflowai.brain\03_APPS\airship\apps\dashboard" cmd /k "node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173"
timeout /t 2 /nobreak >nul
start http://localhost:5173
