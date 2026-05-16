@echo off
cd /d "%~dp0\.."
echo starting live import login %date% %time% > backend\live-import-login.log
node backend\live-import-login-server.js >> backend\live-import-login.log 2>&1
