$ErrorActionPreference='Stop'
$project=Split-Path -Parent $PSScriptRoot
$node=(Get-Command node.exe).Source
if(-not(Test-Path -LiteralPath "$project/node_modules/vinext/dist/cli.js")) {
  $npm=Join-Path (Split-Path $node) 'node_modules/npm/bin/npm-cli.js'
  Push-Location $project
  try { & $node $npm ci --no-audit --no-fund; if($LASTEXITCODE -ne 0){throw 'Dependency installation failed.'} } finally { Pop-Location }
}
$address='http://localhost:3010'
$alive=$null
try {$alive=Invoke-RestMethod "$address/demo-info.json" -TimeoutSec 2} catch {}
if($alive -and $alive.project -ne 'cslg-demo'){throw 'Port 3010 is occupied by another project.'}
if(-not $alive){
  New-Item -ItemType Directory -Force "$project/outputs" | Out-Null
  $arguments='"{0}" dev --hostname 0.0.0.0 --port 3010' -f (Join-Path $project 'node_modules/vinext/dist/cli.js')
  $process=Start-Process -FilePath $node -ArgumentList $arguments -WorkingDirectory $project -WindowStyle Hidden -RedirectStandardOutput "$project/outputs/server.log" -RedirectStandardError "$project/outputs/server-error.log" -PassThru
  $process.Id | Set-Content "$project/outputs/server.pid"
  for($attempt=0;$attempt -lt 45;$attempt++){
    Start-Sleep -Seconds 1
    try {$alive=Invoke-RestMethod "$address/demo-info.json" -TimeoutSec 2;if($alive.project -eq 'cslg-demo'){break}}catch{}
    if($process.HasExited){throw 'Server exited; see outputs/server-error.log.'}
  }
  if(-not $alive){throw 'Server startup timed out; see outputs/server.log.'}
}
Start-Process "$address/#merged"
Write-Host "MORI demo: $address/#merged"
