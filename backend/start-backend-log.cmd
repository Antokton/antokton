@echo off
cd /d "%~dp0.."
echo starting backend %date% %time% > backend\launch-backend.log
set NODE_NO_WARNINGS=1
"C:\Program Files\nodejs\node.exe" "backend\server.js" >> backend\launch-backend.log 2>&1
echo backend exited %errorlevel% %date% %time% >> backend\launch-backend.log
