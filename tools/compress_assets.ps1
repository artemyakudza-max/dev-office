# Сжатие игровых ассетов: уменьшение до 512px по ширине, метод NearestNeighbor
# сохраняет резкость пиксель-арта. Оригиналы в design/ не трогаются.
Add-Type -AssemblyName System.Drawing

$files = @(
    "assets\characters\vova.png",
    "assets\characters\vova_character_select.png",
    "assets\sprites\bg_office.png",
    "assets\sprites\vova_poses.png",
    "assets\sprites\boss_states.png"
)
$maxW = 512

foreach ($f in $files) {
    if (-not (Test-Path $f)) {
        Write-Host "$f — нет файла, пропускаю"
        continue
    }
    $path = (Resolve-Path $f).Path
    $img = [System.Drawing.Image]::FromFile($path)
    $ratio = [Math]::Min(1.0, $maxW / $img.Width)
    $w = [int]($img.Width * $ratio)
    $h = [int]($img.Height * $ratio)
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()
    $img.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $size = (Get-Item $path).Length / 1KB
    Write-Host "$f -> ${w}x${h}, $([math]::Round($size)) KB"
}
