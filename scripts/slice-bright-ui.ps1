# Deterministic slicing requested by the user. UI surfaces come from the cleaned atlas.
Add-Type -AssemblyName System.Drawing
$assetDir = Join-Path $PSScriptRoot '../public/assets/ui-bright'
New-Item -ItemType Directory -Force -Path $assetDir | Out-Null
$source = [System.Drawing.Bitmap]::FromFile((Join-Path $PSScriptRoot '../public/ui-concepts-v03/a-bright-cartoon.png'))
$rects = @(
  @('merged',58,1492,130,98),
  @('hunt',296,1493,111,98),
  @('recruit',530,1493,112,98),
  @('city',751,1491,116,98)
)
foreach ($item in $rects) {
  $r = [System.Drawing.Rectangle]::new($item[1],$item[2],$item[3],$item[4])
  $crop = $source.Clone($r, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  # Remove only background connected to the crop edge; dark illustration outlines are barriers.
  $visited = New-Object 'bool[]' ($crop.Width * $crop.Height)
  $queue = [System.Collections.Generic.Queue[int]]::new()
  for ($x=0; $x -lt $crop.Width; $x++) { $queue.Enqueue($x); $queue.Enqueue(($crop.Height-1)*$crop.Width+$x) }
  for ($y=0; $y -lt $crop.Height; $y++) { $queue.Enqueue($y*$crop.Width); $queue.Enqueue($y*$crop.Width+$crop.Width-1) }
  while ($queue.Count -gt 0) {
    $n=$queue.Dequeue(); if ($visited[$n]) { continue }; $visited[$n]=$true
    $x=$n % $crop.Width; $y=[int][Math]::Floor($n / $crop.Width)
    $color=$crop.GetPixel($x,$y)
    if ([Math]::Max($color.R,[Math]::Max($color.G,$color.B)) -lt 64) { continue }
    $crop.SetPixel($x,$y,[System.Drawing.Color]::Transparent)
    if ($x -gt 0) { $queue.Enqueue($n-1) }; if ($x -lt $crop.Width-1) { $queue.Enqueue($n+1) }
    if ($y -gt 0) { $queue.Enqueue($n-$crop.Width) }; if ($y -lt $crop.Height-1) { $queue.Enqueue($n+$crop.Width) }
  }
  $crop.Save((Join-Path $assetDir ('nav-'+$item[0]+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
  $crop.Dispose()
}
$source.Dispose()
$atlas = [System.Drawing.Bitmap]::FromFile((Join-Path $assetDir 'bright-ui-atlas.png'))
$panels = @(
  @('fire',45,116,743,244),
  @('nav',825,54,363,352),
  @('pill',45,527,745,213),
  @('nav-selected',823,450,366,353),
  @('medallion',59,842,459,344),
  @('header',568,892,666,262)
)
foreach ($item in $panels) {
  $r = [System.Drawing.Rectangle]::new($item[1],$item[2],$item[3],$item[4])
  $crop=$atlas.Clone($r,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $crop.Save((Join-Path $assetDir ($item[0]+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
  $crop.Dispose()
}
$atlas.Dispose()
