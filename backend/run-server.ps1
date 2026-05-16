$ErrorActionPreference = "Continue"
$env:NODE_NO_WARNINGS = "1"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location -LiteralPath $root

& "C:\Program Files\nodejs\node.exe" "backend/server.js" *> "backend/server.log"
