@echo off
title Configuration
cd /d "%~dp0"

if exist ".env" del ".env"
node setup.js
echo.
pause
