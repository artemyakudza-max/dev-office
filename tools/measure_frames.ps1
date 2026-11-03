# Measure opaque content bbox per frame of a sprite sheet
param([string]$Path = "assets\sprites\vova_poses.png", [int]$Frames = 3)
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::new((Resolve-Path $Path).Path)
$W = $img.Width; $H = $img.Height
Write-Host ("Sheet: {0}x{1}, frame {2}x{3}" -f $W, $H, ($W / $Frames), $H)
$rect = [System.Drawing.Rectangle]::new(0, 0, $W, $H)
$data = $img.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = $data.Stride
$bytes = New-Object byte[] ($stride * $H)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
$img.UnlockBits($data)
$img.Dispose()

$segW = [int]($W / $Frames)
for ($f = 0; $f -lt $Frames; $f++) {
    $x0 = $f * $segW; $x1 = [Math]::Min($W, (($f + 1) * $segW))
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
    $cw = $maxX - $minX + 1; $ch = $maxY - $minY + 1
    Write-Host ("Frame {0}: content x={1} y={2} w={3} h={4}  (fills {5}% of frame width, {6}% of height; bottom gap {7}px)" -f `
        $f, $minX, $minY, $cw, $ch, [Math]::Round(100.0 * $cw / $segW, 1), [Math]::Round(100.0 * $ch / $H, 1), ($H - 1 - $maxY))
}