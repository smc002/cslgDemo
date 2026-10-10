param([int]$Port = 3011)
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$releasePointer = Join-Path $project 'releases/current-lan.json'
if (-not (Test-Path -LiteralPath $releasePointer)) { throw 'LAN build missing: releases/current-lan.json' }
$release = Get-Content -LiteralPath $releasePointer -Raw | ConvertFrom-Json
$releaseRoot = Join-Path $project $release.directory
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$node = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $node)) { throw 'Node.js runtime not found.' }
$address = "http://127.0.0.1:$Port"
$alive = $null
try { $alive = Invoke-RestMethod "$address/lan-version.json" -TimeoutSec 2 } catch {}
if ($alive) {
  if ($alive.version -ne $release.version) { throw "Port $Port is running another release; stop that release before switching." }
} else {
  if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) { throw "Port $Port is occupied by another service." }
  $cli = Join-Path $project 'scripts/serve-lan-release.cjs'
  $arguments = '"{0}" "{1}" {2} {3}' -f $cli,$releaseRoot,$Port,($Port+10000)
  $env:WRANGLER_SEND_METRICS = 'false'
  $env:WRANGLER_WRITE_LOGS = 'false'
  $process = Start-Process -FilePath $node -ArgumentList $arguments -WorkingDirectory $releaseRoot -WindowStyle Hidden -RedirectStandardOutput "$releaseRoot/server.log" -RedirectStandardError "$releaseRoot/server-error.log" -PassThru
  $process.Id | Set-Content -LiteralPath "$releaseRoot/server.pid"
  for ($attempt=0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Milliseconds 500
    try { $alive = Invoke-RestMethod "$address/lan-version.json" -TimeoutSec 2; if ($alive.version -eq $release.version) { break } } catch {}
    if ($process.HasExited) { throw "Server exited. See $releaseRoot/server-error.log" }
  }
  if (-not $alive) { throw "Server startup timed out. See $releaseRoot/server.log" }
}
Write-Host "LAN release: $($release.version)"
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { Write-Host "http://$($_.IPAddress):$Port/#merged" }
