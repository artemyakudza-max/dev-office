# Analyze sprite sheet: bbox of opaque pixels per frame (fast, LockBits)
param(
    [string]$Path = "design\assets\characters\vova_poses.png",
    [int]$Frames = 3
)
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::new((Resolve-Path $Path).Path)
$W = $img.Width; $H = $img.Height
Write-Host ("Input: " + $W + "x" + $H)

$rect = [System.Drawing.Rectangle]::new(0, 0, $W, $H)
$data = $img.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = $data.Stride
$bytes = New-Object byte[] ($stride * $H)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
$img.UnlockBits($data)
$img.Dispose()

$segW = [Math]::Floor($W / $Frames)
for ($f = 0; $f -lt $Frames; $f++) {
    $x0 = $f * $segW
    $x1 = [Math]::Min($W, (($f + 1) * $segW))
    $minX = $x1; $maxX = -1; $minY = $H; $maxY = -1
    for ($y = 0; $y -lt $H; $y++) {
        $row = $y * $stride
        for ($x = $x0; $x -lt $x1; $x++) {
            if ($bytes[$row + ($x * 4) + 3] -gt 0) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    Write-Host ("Frame " + $f + ": x=" + $minX + " y=" + $minY + " w=" + ($maxX - $minX + 1) + " h=" + ($maxY - $minY + 1))
}
