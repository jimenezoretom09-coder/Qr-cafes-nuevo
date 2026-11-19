@echo off
chcp 65001 >nul
cd /d "%~dp0"
title RMS Cafes - Demo
echo ================================================
echo   RMS Cafes - demo local (El Sombrerero)
echo   No cierres esta ventana mientras la uses.
echo ================================================
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Falta Node.js. Descargalo de https://nodejs.org ^(version LTS^), instalalo
  echo y vuelve a abrir este archivo.
  pause
  exit /b 1
)
if not exist node_modules (
  echo.
  echo Instalando por primera vez ^(tarda unos minutos^)...
  call npm install
  if errorlevel 1 (
    echo No se pudo instalar. Revisa tu conexion a internet.
    pause
    exit /b 1
  )
)
node scripts\demo-local.mjs
echo.
echo La demo se detuvo. Revisa el mensaje de arriba.
pause
