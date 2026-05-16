@echo off
cd /d "%~dp0.."
set NODE_NO_WARNINGS=1
"C:\Program Files\nodejs\node.exe" "backend\server.js"
