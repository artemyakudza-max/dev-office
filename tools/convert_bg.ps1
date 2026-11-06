# Конвертация фона: PNG из design/ -> JPEG в assets/sprites/.
# Даунскейл до макс. ширины (NearestNeighbor сохраняет пиксель-арт), JPEG q80.
# Фоны не требуют прозрачности, JPEG весит в разы меньше (правило AGENTS.md).
# Запуск: powershell -NoProfile -ExecutionPolicy Bypass -File tools\convert_bg.ps1
#         -InPath design\assets\characters\bg_ciceridis.png -OutPath assets\sprites\bg_ciceridis.jpg
param(
	[string]$InPath = "design\assets\characters\bg_ciceridis.png",
	[string]$OutPath = "assets\sprites\bg_ciceridis.jpg",
	[int]$MaxWidth = 720,
	[int]$Quality = 80
)
Add-Type -AssemblyName System.Drawing
$ms = New-Object System.IO.MemoryStream (, [System.IO.File]::ReadAllBytes((Resolve-Path $InPath).Path))
$src = [System.Drawing.Bitmap]::new($ms)
$ratio = [Math]::Min(1.0, $MaxWidth / $src.Width)
$w = [int]($src.Width * $ratio)
$h = [int]($src.Height * $ratio)
$bmp = New-Object System.Drawing.Bitmap ($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($src, 0, 0, $w, $h)
$g.Dispose()
$src.Dispose()
$ms.Dispose()
# JPEG-энкодер с качеством
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
$bmp.Save($OutPath, $codec, $ep)
$bmp.Dispose()
$kb = [math]::Round((Get-Item $OutPath).Length / 1KB)
Write-Host "$OutPath -> ${w}x${h}, $kb KB (q$Quality)"
