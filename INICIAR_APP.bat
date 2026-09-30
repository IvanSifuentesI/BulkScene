@echo off
title BULKSCENE STUDIO UNIFICADO - 7 MODELOS NVIDIA + 4K UHD + WHISPER
cls

echo ===============================================================================
echo        BULKSCENE STUDIO UNIFICADO - 7 MODELOS NVIDIA + 4K UHD + WHISPER
echo ===============================================================================
echo.

pushd "%~dp0"

echo [1/3] Liberando puerto 5173 para evitar bloqueos...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo [INFO] Cerrando proceso anterior en puerto 5173 (PID %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

if not exist "package.json" (
    echo [ERROR] No se encontro package.json en %CD%
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [2/3] Instalando dependencias necesarias...
    call npm install
)

echo.
echo [2/3] Abriendo http://localhost:5173 en tu navegador...
start "" "http://localhost:5173"

echo.
echo ===============================================================================
echo   Iniciando Servidor Vite con Proxies NVIDIA FLUX + Groq + Gemini...
echo   Para cerrar la aplicacion, simplemente cierra esta ventana.
echo ===============================================================================
echo.

call npm run dev
popd
pause
