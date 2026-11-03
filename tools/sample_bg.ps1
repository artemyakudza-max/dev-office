# Sample background color: median of edge pixels + histogram of edge colors
param([string]$Path = "design\assets\characters\boss_states.png")
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::new((Resolve-Path $Path).Path)
$W = $img.Width; $H = $img.Height

$rs = New-Object System.Collections.Generic.List[int]
$gs = New-Object System.Collections.Generic.List[int]
$bs = New-Object System.Collections.Generic.List[int]

# Top and bottom rows, left/right columns (every 7th pixel)
for ($x = 0; $x -lt $W; $x += 7) {
    foreach ($y in @(2, ($H - 3))) {
        $c = $img.GetPixel($x, $y)
        $rs.Add($c.R); $gs.Add($c.G); $bs.Add($c.B)
    }
}
for ($y = 0; $y -lt $H; $y += 7) {
    foreach ($x in @(2, ($W - 3))) {
        $c = $img.GetPixel($x, $y)
        $rs.Add($c.R); $gs.Add($c.G); $bs.Add($c.B)
    }
}
$rs.Sort(); $gs.Sort(); $bs.Sort()
$n = $rs.Count
$med = { param($list) $list[[int]($list.Count / 2)] }
Write-Host ("Edge pixels sampled: " + $n)
Write-Host ("Median edge color: R=" + (& $med $rs) + " G=" + (& $med $gs) + " B=" + (& $med $bs))
Write-Host ("Min: R=" + $rs[0] + " G=" + $gs[0] + " B=" + $bs[0])
Write-Host ("Max: R=" + $rs[$n-1] + " G=" + $gs[$n-1] + " B=" + $bs[$n-1])
Write-Host ("P25: R=" + $rs[[int]($n*0.25)] + " G=" + $gs[[int]($n*0.25)] + " B=" + $bs[[int]($n*0.25)])
Write-Host ("P75: R=" + $rs[[int]($n*0.75)] + " G=" + $gs[[int]($n*0.75)] + " B=" + $bs[[int]($n*0.75)])
$img.Dispose()
