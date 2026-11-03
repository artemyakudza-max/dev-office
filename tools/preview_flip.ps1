# Превью сцены: фон + флипчарт + босс в игровых позициях (логика 360x640, масштаб x3)
# Проверка подключения спрайта флипчарта без запуска игры
param([int]$Frame = 0, [switch]$Telegraph)
Add-Type -AssemblyName System.Drawing

$S = 3; $W = 360 * $S; $H = 640 * $S
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)

# Фон: растягивается на весь экран (как в scene.draw)
$bg = [System.Drawing.Image]::FromFile((Resolve-Path "assets\sprites\bg_office.png").Path)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.DrawImage($bg, 0, 0, $W, $H)
$bg.Dispose()

# Флипчарт: h = dh*hFrac, w = h*frame.w/frame.h, центр fx, низ fy (как drawFlipchart)
$fc = [System.Drawing.Image]::FromFile((Resolve-Path "assets\sprites\flipchart.png").Path)
$fh = 640 * 0.30 * $S
$fw = $fh * (639.0 / 1042)
$fx = 360 * 0.68 * $S - $fw / 2
$fy = 640 * 0.845 * $S - $fh
$srcW = 639; $srcH = 1042
$g.DrawImage($fc, [System.Drawing.RectangleF]::new($fx, $fy, $fw, $fh),
    [System.Drawing.RectangleF]::new($Frame * $srcW, 0, $srcW, $srcH),
    [System.Drawing.GraphicsUnit]::Pixel)
$fc.Dispose()

# Босс поверх: кадр 0 (у флипчарта), fx 0.62, fy 0.855, hFrac 0.26
$boss = [System.Drawing.Image]::FromFile((Resolve-Path "assets\sprites\boss_states.png").Path)
$bh = 640 * 0.26 * $S
$bw = $bh * (256.0 / 573)
$bx = 360 * 0.62 * $S - $bw / 2
$by = 640 * 0.855 * $S - $bh
$g.DrawImage($boss, [System.Drawing.RectangleF]::new($bx, $by, $bw, $bh),
    [System.Drawing.RectangleF]::new(0, 0, 256, 573), [System.Drawing.GraphicsUnit]::Pixel)
$boss.Dispose()

$g.Dispose()
$out = "tools\preview_flip.png"
$bmp.Save((Join-Path $PWD $out), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Saved $out (${W}x${H}, frame $Frame, telegraph=$Telegraph)"
