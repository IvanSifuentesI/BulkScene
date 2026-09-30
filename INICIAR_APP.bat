@echo off
setlocal enabledelayedexpansion
title BULKSCENE STUDIO - SERVIDOR LOCAL
cls

echo ===============================================================================
echo             BULKSCENE STUDIO - INICIANDO APLICACION
echo ===============================================================================
echo.

cd /d "%~dp0"

if not exist "package.json" (
    echo [ERROR] No se encontro el archivo package.json.
    echo Carpeta actual: %CD%
    echo.
    pause
    exit /b 1
)

echo [1/2] Verificando dependencias...
if not exist "node_modules" (
    echo Instalando modulos de Node.js por primera vez...
    call npm install
)

echo [2/2] Abriendo BulkScene Studio en tu navegador web...
start "" "http://localhost:5173"

echo.
echo ===============================================================================
echo   Servidor Vite activo en: http://localhost:5173
echo   (Para detener la aplicacion, simplemente cierra esta ventana)
echo ===============================================================================
echo.

call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [AVISO] El servidor se ha detenido.
    pause
)
