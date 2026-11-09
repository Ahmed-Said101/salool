@echo off
title Dukaan - server (leave this window open)
cd /d "%~dp0"
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:4180/"
node server.js
echo.
echo Server stopped. Press any key to close.
pause >nul
