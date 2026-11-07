# Diagnostic 2: pixel-level scanlines across character boundaries
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::new((Resolve-Path "design\assets\Vovan\vova_poses.png").Path)
$W = $img.Width; $H = $img.Height

function ScanRow($img, $y, $x0, $x1, $label) {
    Write-Host ("ROW y=" + $y + " " + $label)
    $prev = $null
    for ($x = $x0; $x -le $x1; $x++) {
        $c = $img.GetPixel($x, $y)
        if ($null -eq $prev -or [Math]::Abs($c.R - $prev.R) + [Math]::Abs($c.G - $prev.G) + [Math]::Abs($c.B - $prev.B) -gt 12) {
            Write-Host ("  x=" + $x + " rgb=" + $c.R + "," + $c.G + "," + $c.B)
        }
        $prev = $c
    }
}
function ScanCol($img, $x, $y0, $y1, $label) {
    Write-Host ("COL x=" + $x + " " + $label)
    $prev = $null
    for ($y = $y0; $y -le $y1; $y++) {
        $c = $img.GetPixel($x, $y)
        if ($null -eq $prev -or [Math]::Abs($c.R - $prev.R) + [Math]::Abs($c.G - $prev.G) + [Math]::Abs($c.B - $prev.B) -gt 12) {
            Write-Host ("  y=" + $y + " rgb=" + $c.R + "," + $c.G + "," + $c.B)
        }
        $prev = $c
    }
}

# Frame 1 occupies x 0..949. Character center ~x=474.
# Head top boundary (vertical scan through head)
ScanCol $img 474 280 360 "head top (skin starts ~320)"
# Hoodie left boundary (horizontal scan through chest y=700)
ScanRow $img 700 250 350 "hoodie left edge"
# Jeans/leg boundary (horizontal scan through shin y=1250)
ScanRow $img 1250 380 620 "leg area"
# Chair legs / floor shadow (horizontal scan y=1500)
ScanRow $img 1500 300 700 "floor/shadow area"
# Bottom edge of character (vertical scan x=474, y=1450..1599)
ScanCol $img 474 1450 1599 "bottom edge"
$img.Dispose()
