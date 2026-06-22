@echo off
chcp 65001 >nul
echo.
echo ================================================
echo   GestionProyectos PWA - Instalacion
echo ================================================
echo.

:: Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no encontrado en el PATH.
    echo.
    echo Por favor instala Python desde: https://www.python.org/downloads/
    echo Asegurate de marcar "Add Python to PATH" durante la instalacion.
    echo.
    pause
    exit /b 1
)

echo [OK] Python encontrado:
python --version
echo.

:: Instalar dependencias
echo Instalando dependencias del backend...
cd backend
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion de dependencias.
    pause
    exit /b 1
)

echo.
echo ================================================
echo   Instalacion completa!
echo   Ejecuta: iniciar.bat  (o python run.py)
echo ================================================
echo.
cd ..
pause
