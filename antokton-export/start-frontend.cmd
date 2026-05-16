@echo off
cd /d "%~dp0"
set NODE_NO_WARNINGS=1
"C:\Program Files\nodejs\npm.cmd" run dev -- --host 0.0.0.0 --port 5173
