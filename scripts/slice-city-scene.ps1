# Reproducible sprite atlas slicing. True alpha is retained; no background repainting.
Add-Type -AssemblyName System.Drawing
$cityAssets = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/assets/city-scene'))
$sets = @(
  @{name='workshop';source='lumber-atlas-v05.png';bounds=@(@(49,104,476,417),@(540,73,964,425),@(1017,50,1496,435),@(20,521,488,923),@(500,493,996,933),@(1000,444,1531,971))},
  @{name='factory';source='ammo-atlas-v05.png';bounds=@(@(35,119,484,452),@(537,72,985,439),@(1040,8,1518,443),@(23,514,492,947),@(516,484,1010,958),@(1018,447,1536,986))}
)
foreach ($set in $sets) {
  $sheet = [System.Drawing.Bitmap]::FromFile((Join-Path $cityAssets $set.source))
  for ($i=0;$i -lt 6;$i++) {
    $b=$set.bounds[$i]
    $r=[System.Drawing.Rectangle]::new($b[0],$b[1],($b[2]-$b[0]),($b[3]-$b[1]))
    $sprite=[System.Drawing.Bitmap]::new(512,512,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g=[System.Drawing.Graphics]::FromImage($sprite)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $scale=[Math]::Min(480.0/$r.Width,480.0/$r.Height)
    $w=[int]($r.Width*$scale);$h=[int]($r.Height*$scale)
    $dest=[System.Drawing.Rectangle]::new([int]((512-$w)/2),500-$h,$w,$h)
    $g.DrawImage($sheet,$dest,$r,[System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $sprite.Save((Join-Path $cityAssets ($set.name+'-'+$i+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
    $sprite.Dispose()
  }
  $sheet.Dispose()
}
@{canvas=@(512,512);footAnchor=@(256,500);visualMinLevels=@(0,1,2,3,5,8);sets=$sets} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $cityAssets 'slices.json') -Encoding utf8
