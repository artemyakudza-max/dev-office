# Диагностика спрайт-листа босса: размер, цвета фона по краям, bbox кадров
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile((Resolve-Path "design\assets\Vovan\boss_states.png").Path)
$W = $img.Width; $H = $img.Height
Write-Host ("size: {0}x{1}" -f $W, $H)

# Цвета по краям (углы и середины сторон)
$pts = @(
    @(3, 3), @($W - 4, 3), @(3, ($H - 4)), @($W - 4, ($H - 4)),
    @([int]($W / 2), 3), @([int]($W / 2), ($H - 4)),
    @(3, [int]($H / 2)), @($W - 4, [int]($H / 2))
)
foreach ($p in $pts) {
    $c = $img.GetPixel($p[0], $p[1])
    Write-Host ("  ({0},{1}) rgba={2},{3},{4},{5}" -f $p[0], $p[1], $c.R, $c.G, $c.B, $c.A)
}

# Вертикальный скан в середине каждого из 4 кадров: где кончается фон
$frameW = [int]($W / 4)
for ($f = 0; $f -lt 4; $f++) {
    $cx = [int]($f * $frameW + $frameW / 2)
    $firstOpaque = -1; $lastOpaque = -1
    for ($y = 0; $y -lt $H; $y++) {
        $c = $img.GetPixel($cx, $y)
        if ($c.A -gt 10) {
            if ($firstOpaque -lt 0) { $firstOpaque = $y }
            $lastOpaque = $y
        }
    }
    Write-Host ("frame {0}: center x={1}, opaque y=[{2}..{3}]" -f $f, $cx, $firstOpaque, $lastOpaque)
}
$img.Dispose()
