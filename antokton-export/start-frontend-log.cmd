@echo off
cd /d "%~dp0"
echo starting frontend %date% %time% > ..\backend\launch-frontend.log
set NODE_NO_WARNINGS=1
"C:\Program Files\nodejs\npm.cmd" run dev -- --host 0.0.0.0 --port 5173 >> ..\backend\launch-frontend.log 2>&1
echo frontend exited %errorlevel% %date% %time% >> ..\backend\launch-frontend.log
