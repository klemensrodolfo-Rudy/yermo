@echo off
cd /d "%~dp0"
echo ============================================
echo   YERMO - Servidor dedicado (mundo online)
echo ============================================
echo.
set /p MUNDO=Nombre del mundo [servidor]:
if "%MUNDO%"=="" set MUNDO=servidor
set /p TIPO=Tipo (normal / brew) [normal]:
if "%TIPO%"=="" set TIPO=normal
echo.
echo Tus amigos entran a  http://TU-IP:5173  y tocan "Entrar al servidor".
echo Para ver tu IP local: ipconfig (IPv4). Cerra esta ventana o Ctrl+C para apagarlo (se guarda solo).
echo.
start "" http://localhost:5173
node server.js --dedicado --mundo %MUNDO% --tipo %TIPO%
pause
