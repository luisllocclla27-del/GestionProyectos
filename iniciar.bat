@echo off
chcp 65001 >nul
echo.
echo ================================================
echo   GestionProyectos PWA
echo   http://localhost:8000
echo ================================================
echo.
cd /d "%~dp0"
python run.py
pause
