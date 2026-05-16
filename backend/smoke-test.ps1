$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$appId = $env:APP_ID
if (-not $appId) { $appId = "6991d40eddf82cc25ec834a7" }

$job = Start-Job -ScriptBlock {
  param($wd)
  Set-Location -LiteralPath $wd
  $env:NODE_NO_WARNINGS = "1"
  node backend/server.js
} -ArgumentList $root.Path

try {
  Start-Sleep -Seconds 2

  $health = Invoke-WebRequest -Uri "http://127.0.0.1:8787/health" -UseBasicParsing
  $schemas = Invoke-WebRequest -Uri "http://127.0.0.1:8787/api/local/entity-schemas" -UseBasicParsing
  $settings = Invoke-WebRequest -Uri "http://127.0.0.1:8787/api/apps/public/prod/public-settings/by-id/$appId" -UseBasicParsing
  $user = Invoke-WebRequest -Uri "http://127.0.0.1:8787/api/apps/$appId/entities/User/me" -UseBasicParsing
  $created = Invoke-WebRequest -Uri "http://127.0.0.1:8787/api/apps/$appId/entities/Job" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"title":"Smoke Test Job","status":"approved","category":"test"}' `
    -UseBasicParsing
  $query = [uri]::EscapeDataString('{"status":"approved"}')
  $listed = Invoke-WebRequest -Uri "http://127.0.0.1:8787/api/apps/$appId/entities/Job?q=$query&sort=-created_date&limit=1" -UseBasicParsing

  Write-Output "health=$($health.StatusCode)"
  Write-Output "schemas=$($schemas.StatusCode)"
  Write-Output "settings=$($settings.StatusCode)"
  Write-Output "user=$($user.StatusCode)"
  Write-Output "create=$($created.StatusCode)"
  Write-Output "list=$($listed.StatusCode)"
} finally {
  Stop-Job $job -ErrorAction SilentlyContinue
  Remove-Job $job -Force -ErrorAction SilentlyContinue
}
