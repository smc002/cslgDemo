param([int]$Port = 3011)
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$pointer = Join-Path $project 'releases/current-lan.json'
$previousJson = if (Test-Path -LiteralPath $pointer) { Get-Content -LiteralPath $pointer -Raw } else { $null }
$previous = if ($previousJson) { $previousJson | ConvertFrom-Json } else { $null }
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$node = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $node)) { throw 'Node.js runtime not found.' }

function Stop-LanRelease {
  $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
  foreach ($listenerId in ($listeners.OwningProcess | Select-Object -Unique)) {
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $listenerId"
    $expectedScript = Join-Path $project 'scripts/serve-lan-release.cjs'
    $expectedRoot = Join-Path $project 'releases'
    if (-not $processInfo.CommandLine -or
        -not $processInfo.CommandLine.Contains($expectedScript) -or
        -not $processInfo.CommandLine.Contains($expectedRoot)) {
      throw "Port $Port belongs to an unrelated process; refusing to stop it."
    }
    & taskkill.exe /PID $listenerId /T /F
    if ($LASTEXITCODE -ne 0) { throw "Failed to stop LAN process $listenerId." }
  }
}

Push-Location $project
try {
  # Build before stopping the running release; a failed build leaves it available.
  & $node (Join-Path $project 'node_modules/vinext/dist/cli.js') build
  if ($LASTEXITCODE -ne 0) { throw 'Build failed; running LAN release was not changed.' }
  $version = 'lan-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff')
  $releaseRoot = Join-Path $project "releases/$version"
  New-Item -ItemType Directory -Path $releaseRoot | Out-Null
  Copy-Item -LiteralPath (Join-Path $project 'dist/client') -Destination $releaseRoot -Recurse
  Copy-Item -LiteralPath (Join-Path $project 'dist/server') -Destination $releaseRoot -Recurse
  $demo = Get-Content -LiteralPath "$releaseRoot/client/demo-info.json" -Raw | ConvertFrom-Json
  $metadata = [ordered]@{
    project = 'cslg-demo'; version = $version; appVersion = $demo.version
    builtAt = (Get-Date).ToString('o'); directory = "releases/$version"
    previous = $previous.version
  } | ConvertTo-Json
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText("$releaseRoot/client/lan-version.json", $metadata, $utf8NoBom)
  Stop-LanRelease
  try {
    [System.IO.File]::WriteAllText($pointer, $metadata, $utf8NoBom)
    & (Join-Path $PSScriptRoot 'start-lan-demo.ps1') -Port $Port
    $served = Invoke-RestMethod "http://127.0.0.1:$Port/lan-version.json" -TimeoutSec 10
    if ($served.version -ne $version) { throw 'Served release does not match the new build.' }
    Write-Host "Published current workspace: $version ($($demo.version))"
  } catch {
    $publishFailure = $_
    if ($previousJson) {
      Stop-LanRelease
      $previousJson | Set-Content -LiteralPath $pointer -Encoding utf8
      & (Join-Path $PSScriptRoot 'start-lan-demo.ps1') -Port $Port
      Write-Warning 'Previous LAN release restored.'
    }
    throw $publishFailure
  }
} finally {
  Pop-Location
}
