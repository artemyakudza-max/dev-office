# Превью сцены в математике игры: фон cover-fit + anchorRect + персонажи.
# Проверка позиций на разных экранах без запуска игры.
# -Mode phone   — портретный телефон 390x844
# -Mode desktop — десктоп 1280x720
param([int]$Frame = 0, [string]$Mode = "phone")
Add-Type -AssemblyName System.Drawing

if ($Mode -eq "desktop") { $CW = 1280; $CH = 720 } else { $CW = 390; $CH = 844 }
$W = 360.0; $H = 640.0

$bmp = New-Object System.Drawing.Bitmap($CW, $CH)
$g = [System.Drawing.Graphics]::FromImage($bmp)

# Логика сцены (как в scene.draw): letterbox 360x640, видимая область x0..x1/y0..y1
$scale = [Math]::Min($CW / $W, $CH / $H)
$offX = ($CW - $W * $scale) / 2
$offY = ($CH - $H * $scale) / 2
$x0 = -$offX / $scale; $x1 = ($CW - $offX) / $scale
$y0 = -$offY / $scale; $y1 = ($CH - $offY) / $scale
$vw = $x1 - $x0; $vh = $y1 - $y0

# Фон cover-fit (как в scene.draw)
$bg = [System.Drawing.Image]::FromFile((Resolve-Path "assets\sprites\bg_office.png").Path)
$s = [Math]::Max($vw / $bg.Width, $vh / $bg.Height)
$dw = $bg.Width * $s; $dh = $bg.Height * $s
$dx = $x0 + ($vw - $dw) / 2; $dy = $y0 + ($vh - $dh) / 2
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.DrawImage($bg, [System.Drawing.RectangleF]::new(
    ($offX + $dx * $scale), ($offY + $dy * $scale), $dw * $scale, $dh * $scale),
    [System.Drawing.RectangleF]::new(0, 0, $bg.Width, $bg.Height), [System.Drawing.GraphicsUnit]::Pixel)
$bg.Dispose()

# anchorRect: пересечение фона с видимой областью (как в scene.draw)
$ax0 = [Math]::Max($dx, $x0); $ay0 = [Math]::Max($dy, $y0)
$ax1 = [Math]::Min($dx + $dw, $x1); $ay1 = [Math]::Min($dy + $dh, $y1)
$adw = $ax1 - $ax0; $adh = $ay1 - $ay0
# Опорная высота персонажей (как scene.unitH): ограничение по ширине экрана
$auh = [Math]::Min($adh, $adw * 1.5)

# Функция перевода логических координат в пиксели канваса
function L2P([double]$lx, [double]$ly) {
    return @{ X = $script:offX + $lx * $script:scale; Y = $script:offY + $ly * $scale }
}

# Раскладка (как scene.layout): узкий экран — края, широкий — доли fx
$vovaW = $auh * 0.30 * (256.0 / 434)
$bossW = $auh * 0.26 * (256.0 / 573)
$flipW = $auh * 0.27 * (639.0 / 1042)
$gap = $bossW * 0.75
$m = 10
if ($adw -lt 500) {
    $flipCx = $ax0 + $adw - $m - $flipW / 2
    $bossCx = $flipCx - $gap
    $vovaCx = $ax0 + $m + $vovaW / 2
} else {
    $vovaCx = $ax0 + $adw * 0.40
    $bossCx = $ax0 + $adw * 0.62
    $flipCx = $bossCx + $gap
}
$fc = [System.Drawing.Image]::FromFile((Resolve-Path "assets\sprites\flipchart.png").Path)
$fh = $auh * 0.27; $fw = $flipW
$fcx = $flipCx - $fw / 2; $fcy = $ay0 + $adh * 0.845 - $fh
$p = L2P $fcx $fcy
$g.DrawImage($fc, [System.Drawing.RectangleF]::new($p.X, $p.Y, $fw * $scale, $fh * $scale),
    [System.Drawing.RectangleF]::new($Frame * 639, 0, 639, 1042), [System.Drawing.GraphicsUnit]::Pixel)
$fc.Dispose()
Write-Host ("flipchart: logical x={0:F0}..{1:F0} (экран 0..{2:F0})" -f $fcx, ($fcx + $fw), $x1)

# Босс: hFrac 0.26, fy 0.855, кадр 0 — позиция из раскладки
$boss = [System.Drawing.Image]::FromFile((Resolve-Path "assets\sprites\boss_states.png").Path)
$bh = $auh * 0.26; $bw = $bossW
$bx = $bossCx - $bw / 2; $by = $ay0 + $adh * 0.855 - $bh
$p = L2P $bx $by
$g.DrawImage($boss, [System.Drawing.RectangleF]::new($p.X, $p.Y, $bw * $scale, $bh * $scale),
    [System.Drawing.RectangleF]::new(0, 0, 256, 573), [System.Drawing.GraphicsUnit]::Pixel)
$boss.Dispose()

# Точки голов (headPoint) — маркеры, где появляются плашки
foreach ($who in @(@("boss", $bossCx, 0.26, 0.855), @("vova", $vovaCx, 0.30, 0.91))) {
    $hh = $auh * $who[2]
    $hx = $who[1]; $hy = $ay0 + $adh * $who[3] - $hh
    $p = L2P $hx $hy
    $g.FillEllipse([System.Drawing.Brushes]::Lime, $p.X - 4, $p.Y - 4, 8, 8)
    Write-Host ("head {0}: logical x={1:F0} y={2:F0}" -f $who[0], $hx, $hy)
}

$g.Dispose()
$out = "tools\preview_flip.png"
$bmp.Save((Join-Path $PWD $out), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Saved $out (${CW}x${CH}, mode=$Mode, frame=$Frame)"
