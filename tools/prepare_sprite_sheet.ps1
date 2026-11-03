# Sprite sheet preparation: remove background via region growing from edges.
# Region growing with LOCAL tolerance (background is a smooth gradient) and
# a barrier for near-black outline pixels (maxC < 15) so the fill cannot
# leak through character outlines into the body.
# Input:  design/assets/characters/vova_poses.png (3 frames in a row, opaque bg)
# Output: assets/sprites/vova_poses.png (transparent bg, frames aligned to bottom)
param(
    [string]$InPath = "design\assets\characters\vova_poses.png",
    [string]$OutPath = "assets\sprites\vova_poses.png",
    [int]$Frames = 3,
    [int]$Tol = 8
)
Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::new((Resolve-Path $InPath).Path)
$W = $img.Width; $H = $img.Height
Write-Host "Input: ${W}x${H}"

$rect = [System.Drawing.Rectangle]::new(0, 0, $W, $H)
$data = $img.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = $data.Stride
$bytes = New-Object byte[] ($stride * $H)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
$img.UnlockBits($data)

function GetR([int]$o) { return $bytes[$o + 2] }
function GetG([int]$o) { return $bytes[$o + 1] }
function GetB([int]$o) { return $bytes[$o] }

# visited = pixel is background (will become transparent)
$visited = New-Object bool[] ($W * $H)
$queue = [System.Collections.Generic.Queue[int]]::new()

# Seed: all edge pixels that are not near-black outlines
for ($x = 0; $x -lt $W; $x++) {
    foreach ($y in @(0, ($H - 1))) {
        $o = ($y * $stride) + ($x * 4)
        $maxC = [Math]::Max((GetR $o), [Math]::Max((GetG $o), (GetB $o)))
        if ($maxC -ge 15) { $i = $y * $W + $x; $visited[$i] = $true; $queue.Enqueue($i) }
    }
}
for ($y = 0; $y -lt $H; $y++) {
    foreach ($x in @(0, ($W - 1))) {
        $o = ($y * $stride) + ($x * 4)
        $maxC = [Math]::Max((GetR $o), [Math]::Max((GetG $o), (GetB $o)))
        if ($maxC -ge 15) { $i = $y * $W + $x; $visited[$i] = $true; $queue.Enqueue($i) }
    }
}

# Region growing: accept neighbour if close to CURRENT pixel (local tolerance)
# and not a near-black outline barrier.
while ($queue.Count -gt 0) {
    $i = $queue.Dequeue()
    $x = $i % $W
    $y = [Math]::Floor($i / $W)
    $o = ($y * $stride) + ($x * 4)
    $cr = GetR $o; $cg = GetG $o; $cb = GetB $o
    # neighbours: left, right, up, down
    foreach ($d in @(@(-1, 0), @(1, 0), @(0, -1), @(0, 1))) {
        $nx = $x + $d[0]; $ny = $y + $d[1]
        if (($nx -ge 0) -and ($nx -lt $W) -and ($ny -ge 0) -and ($ny -lt $H)) {
            $ni = $ny * $W + $nx
            if (-not $visited[$ni]) {
                $no = ($ny * $stride) + ($nx * 4)
                $nr = GetR $no; $ng = GetG $no; $nb = GetB $no
                $nmax = [Math]::Max($nr, [Math]::Max($ng, $nb))
                if ($nmax -ge 15) {
                    $dr = [Math]::Abs($nr - $cr); $dg = [Math]::Abs($ng - $cg); $db = [Math]::Abs($nb - $cb)
                    if (($dr -le $Tol) -and ($dg -le $Tol) -and ($db -le $Tol)) {
                        $visited[$ni] = $true
                        $queue.Enqueue($ni)
                    }
                }
            }
        }
    }
}

$bgCount = 0
for ($i = 0; $i -lt $visited.Length; $i++) { if ($visited[$i]) { $bgCount++ } }
Write-Host ("Background pixels: " + $bgCount + " of " + ($W * $H) + " (" + [Math]::Round(100.0 * $bgCount / ($W * $H), 1) + "%)")

# Apply transparency
for ($y = 0; $y -lt $H; $y++) {
    for ($x = 0; $x -lt $W; $x++) {
        if ($visited[$y * $W + $x]) { $bytes[($y * $stride) + ($x * 4) + 3] = 0 }
    }
}

# Write alpha back
$outImg = [System.Drawing.Bitmap]::new($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$odata = $outImg.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $odata.Scan0, $bytes.Length)
$outImg.UnlockBits($odata)

# BBox of opaque pixels per vertical segment
$segW = [Math]::Floor($W / $Frames)
$boxes = @()
for ($f = 0; $f -lt $Frames; $f++) {
    $x0 = $f * $segW
    $x1 = [Math]::Min($W, (($f + 1) * $segW))
    $minX = $x1; $maxX = -1; $minY = $H; $maxY = -1
    for ($y = 0; $y -lt $H; $y++) {
        for ($x = $x0; $x -lt $x1; $x++) {
            if ($bytes[($y * $stride) + ($x * 4) + 3] -gt 0) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if ($maxX -lt 0) { throw ("Frame " + $f + " is empty - check input file") }
    $boxes += ,@($minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1))
    Write-Host ("Frame " + $f + ": x=" + $minX + " y=" + $minY + " w=" + ($maxX - $minX + 1) + " h=" + ($maxY - $minY + 1))
}

# New sheet: uniform frame size, aligned to bottom (floor line)
$pad = 4
$maxBW = ($boxes | ForEach-Object { $_[2] } | Measure-Object -Maximum).Maximum
$maxBH = ($boxes | ForEach-Object { $_[3] } | Measure-Object -Maximum).Maximum
$frameW = [int]($maxBW + $pad * 2)
$frameH = [int]($maxBH + $pad)
$sheet = [System.Drawing.Bitmap]::new([int]($frameW * $Frames), $frameH,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for ($f = 0; $f -lt $Frames; $f++) {
    $b = $boxes[$f]
    $dstX = [int]($f * $frameW + ($frameW - $b[2]) / 2)
    $dstY = [int]($frameH - $b[3] - $pad / 2)
    $cut = $outImg.Clone([System.Drawing.Rectangle]::new($b[0], $b[1], $b[2], $b[3]), $outImg.PixelFormat)
    $g = [System.Drawing.Graphics]::FromImage($sheet)
    $g.DrawImage($cut, $dstX, $dstY, $b[2], $b[3])
    $g.Dispose()
    $cut.Dispose()
}
$outImg.Dispose()
$img.Dispose()

$outDir = Split-Path $OutPath -Parent
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$sheet.Save((Join-Path $PWD $OutPath), [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host ("Output: " + $OutPath + " (" + $sheet.Width + "x" + $sheet.Height + ", frame " + $frameW + "x" + $frameH + ")")
$sheet.Dispose()
