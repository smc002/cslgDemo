# Offline compositing proof, using the same layout data and contain fit as the game.
# This is an art review, not a browser screenshot.
Add-Type -AssemblyName System.Drawing
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$reviewRoot = Join-Path $projectRoot 'docs/art/city-v08'
$assetRoot = Join-Path $projectRoot 'public/assets/city-v08'
$layout = Get-Content -LiteralPath (Join-Path $reviewRoot 'layout.json') -Raw | ConvertFrom-Json
foreach ($tier in @(0,1,2)) {
  $canvas = [Drawing.Bitmap]::new(864,1542)
  $graphics = [Drawing.Graphics]::FromImage($canvas)
  $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $terrain = [Drawing.Bitmap]::FromFile((Join-Path $assetRoot 'terrain.png'))
  $graphics.DrawImage($terrain,0,0,864,1542)
  $terrain.Dispose()
  foreach ($building in ($layout | Sort-Object y)) {
    $sprite = [Drawing.Bitmap]::FromFile((Join-Path $assetRoot ($building.id + '-' + $tier + '.png')))
    $boxWidth = 864 * $building.width / 100
    $boxHeight = 1542 * $building.height / 100
    $side = [Math]::Min($boxWidth,$boxHeight)
    $left = 864 * $building.x / 100 - $side / 2
    $top = 1542 * $building.y / 100 - $side
    $dest = [Drawing.RectangleF]::new($left,$top,$side,$side)
    $graphics.DrawImage($sprite,$dest)
    $sprite.Dispose()
  }
  $graphics.Dispose()
  $canvas.Save((Join-Path $reviewRoot ('layout-tier-' + $tier + '.png')),[Drawing.Imaging.ImageFormat]::Png)
  $canvas.Dispose()
}
Write-Output 'Saved 3 offline layout proofs.'
