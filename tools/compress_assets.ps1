# Asset compression: downscale to per-file max width, NearestNeighbor keeps
# pixel art sharp. Originals in design/ are not touched.
Add-Type -AssemblyName System.Drawing

# file -> max width (sprite sheets keep extra detail)
$pairs = @(
    @("assets\characters\vova.png", 512),
    @("assets\characters\vova_character_select.png", 512),
    @("assets\characters\chekeridis_character_select.png", 512),
    # финальные портреты Чекеридиса: 400px JPEG (~70), прозрачность залита
    # тёмно-серым (40,40,40), вес ~25 КБ (на экране портрет ~132px)
    @("assets\characters\chekeridis_final_win.jpg", 400),
    @("assets\characters\chekeridis_final_lose_1_3.jpg", 400),
    @("assets\characters\chekeridis_final_lose_4_6.jpg", 400),
    @("assets\characters\chekeridis_final_lose_7_9.jpg", 400),
    @("assets\characters\chekeridis_final_realunluck.jpg", 400),
    @("assets\sprites\bg_office.png", 720),
    @("assets\sprites\bg_ciceridis.png", 720),
    @("assets\sprites\vova_poses.png", 768),
    @("assets\sprites\boss_states.png", 1024),
    @("assets\sprites\chekeridis_states.png", 1020)
)

foreach ($p in $pairs) {
    $f = $p[0]; $maxW = $p[1]
    if (-not (Test-Path $f)) {
        Write-Host "$f - no file, skip"
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
    if ($path.EndsWith('.jpg')) {
        # JPEG с качеством 70 — портреты весят ~25 КБ
        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
            Where-Object { $_.MimeType -eq 'image/jpeg' }
        $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
            [System.Drawing.Imaging.Encoder]::Quality, [long]70)
        $bmp.Save($path, $codec, $ep)
        $ep.Dispose()
    } else {
        $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    $bmp.Dispose()
    $size = (Get-Item $path).Length / 1KB
    Write-Host "$f -> ${w}x${h}, $([math]::Round($size)) KB"
}
