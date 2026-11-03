# Sprite sheet preparation: remove background via region growing from edges.
# Region growing with LOCAL tolerance (background is a smooth gradient) and
# a barrier for near-black outline pixels (maxC < 15) so the fill cannot
# leak through character outlines into the body.
# Hot loop (flood fill + bbox) is compiled C# — fast even for 4M+ pixels.
# Input:  design/assets/characters/*.png (frames in a row, opaque bg)
# Output: assets/sprites/*.png (transparent bg, frames aligned to bottom)
param(
    [string]$InPath = "design\assets\characters\vova_poses.png",
    [string]$OutPath = "assets\sprites\vova_poses.png",
    [int]$Frames = 3,
    [int]$Tol = 8,
    [string]$Mode = "local"   # local — допуск к соседу; global — нейтрально-серый фон (R~G~B, яркий)
)
Add-Type -AssemblyName System.Drawing

Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;

public static class SpritePrep {
    // Flood fill from edges: pixel becomes background if it is close to the
    // CURRENT pixel (local tolerance) and is not a near-black outline barrier.
    // Returns: bgCount, and fills 'visited' (true = background).
    public static int RemoveBackground(byte[] bytes, int stride, int W, int H, int tol, bool[] visited) {
        var queue = new Queue<int>();
        // Seed: all edge pixels that are not near-black
        for (int x = 0; x < W; x++) { TrySeed(x, 0); TrySeed(x, H - 1); }
        for (int y = 0; y < H; y++) { TrySeed(0, y); TrySeed(W - 1, y); }

        while (queue.Count > 0) {
            int i = queue.Dequeue();
            int x = i % W, y = i / W;
            int o = y * stride + x * 4;
            byte cr = bytes[o + 2], cg = bytes[o + 1], cb = bytes[o];
            for (int d = 0; d < 4; d++) {
                int nx = x + (d == 0 ? -1 : d == 1 ? 1 : 0);
                int ny = y + (d == 2 ? -1 : d == 3 ? 1 : 0);
                if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                int ni = ny * W + nx;
                if (visited[ni]) continue;
                int no = ny * stride + nx * 4;
                byte nr = bytes[no + 2], ng = bytes[no + 1], nb = bytes[no];
                int nmax = Math.Max(nr, Math.Max(ng, nb));
                if (nmax < 15) continue; // outline barrier
                if (Math.Abs(nr - cr) <= tol && Math.Abs(ng - cg) <= tol && Math.Abs(nb - cb) <= tol) {
                    visited[ni] = true;
                    queue.Enqueue(ni);
                }
            }
        }
        int count = 0;
        for (int i = 0; i < visited.Length; i++) if (visited[i]) count++;
        return count;
    }

    private static void TrySeed(int x, int y, byte[] bytes, int stride, int W, int H, bool[] visited, Queue<int> queue) {
        int o = y * stride + x * 4;
        int maxC = Math.Max(bytes[o + 2], Math.Max(bytes[o + 1], bytes[o]));
        if (maxC < 15) return;
        int i = y * W + x;
        if (!visited[i]) { visited[i] = true; queue.Enqueue(i); }
    }

    private static byte[] _bytes; private static int _stride, _W, _H;
    private static bool[] _visited; private static Queue<int> _queue;
    private static void TrySeed(int x, int y) {
        int o = y * _stride + x * 4;
        int maxC = Math.Max(_bytes[o + 2], Math.Max(_bytes[o + 1], _bytes[o]));
        if (maxC < 15) return;
        int i = y * _W + x;
        if (!_visited[i]) { _visited[i] = true; _queue.Enqueue(i); }
    }

    // Convenience wrapper: sets static context then floods.
    public static int Run(byte[] bytes, int stride, int W, int H, int tol, bool[] visited) {
        _bytes = bytes; _stride = stride; _W = W; _H = H;
        _visited = visited; _queue = new Queue<int>();
        for (int x = 0; x < W; x++) { TrySeed(x, 0); TrySeed(x, H - 1); }
        for (int y = 0; y < H; y++) { TrySeed(0, y); TrySeed(W - 1, y); }

        while (_queue.Count > 0) {
            int i = _queue.Dequeue();
            int x = i % W, y = i / W;
            int o = y * stride + x * 4;
            byte cr = bytes[o + 2], cg = bytes[o + 1], cb = bytes[o];
            for (int d = 0; d < 4; d++) {
                int nx = x + (d == 0 ? -1 : d == 1 ? 1 : 0);
                int ny = y + (d == 2 ? -1 : d == 3 ? 1 : 0);
                if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                int ni = ny * W + nx;
                if (_visited[ni]) continue;
                int no = ny * stride + nx * 4;
                byte nr = bytes[no + 2], ng = bytes[no + 1], nb = bytes[no];
                int nmax = Math.Max(nr, Math.Max(ng, nb));
                if (nmax < 15) continue;
                if (Math.Abs(nr - cr) <= tol && Math.Abs(ng - cg) <= tol && Math.Abs(nb - cb) <= tol) {
                    _visited[ni] = true;
                    _queue.Enqueue(ni);
                }
            }
        }
        int count = 0;
        for (int k = 0; k < _visited.Length; k++) if (_visited[k]) count++;
        return count;
    }

    // Chroma mode: background is green (G dominates R and B by margin).
    // Marks ALL green-dominant pixels globally — no flood fill needed,
    // enclosed green pockets (under table, between chair legs) are covered too.
    public static int MarkAllChroma(byte[] bytes, int stride, int W, int H, int margin, bool[] visited) {
        int count = 0;
        for (int y = 0; y < H; y++) {
            int row = y * stride;
            for (int x = 0; x < W; x++) {
                int o = row + x * 4;
                byte r = bytes[o + 2], g = bytes[o + 1], b = bytes[o];
                if (g >= r + margin && g >= b + margin) {
                    visited[y * W + x] = true;
                    count++;
                }
            }
        }
        return count;
    }

    private static bool IsChroma(int i, int margin) {
        int o = (i / _W) * _stride + (i % _W) * 4;
        byte r = _bytes[o + 2], g = _bytes[o + 1], b = _bytes[o];
        return g >= r + margin && g >= b + margin;
    }

    private static void TrySeedC(int x, int y, int margin) {
        int i = y * _W + x;
        if (!_visited[i] && IsChroma(i, margin)) { _visited[i] = true; _queue.Enqueue(i); }
    }

    // Edge cleanup + feathering (Photoshop-like soft brush edge):
    // 1) Fringe removal: opaque pixels within `fringeRing` px of transparency
    //    that are dark (maxC < fringeMax) become transparent — kills black
    //    outline strips left after chroma removal.
    // 2) Feather: opaque pixels within `feather` px of transparency get
    //    reduced alpha (linear ramp), so edges look smooth, not aliased.
    public static void SoftenEdges(byte[] bytes, int stride, int W, int H, int fringeMax, int feather, int fringeRing) {
        // Snapshot alpha channel (we modify in place but read original alpha)
        var alpha = new byte[W * H];
        for (int y = 0; y < H; y++)
            for (int x = 0; x < W; x++)
                alpha[y * W + x] = bytes[y * stride + x * 4 + 3];

        // Pass 1: remove dark fringe (ring around transparency)
        var toClear = new List<int>();
        for (int y = 0; y < H; y++) {
            for (int x = 0; x < W; x++) {
                int i = y * W + x;
                if (alpha[i] == 0) continue;
                bool nearTransparent = false;
                for (int d = 1; d <= fringeRing && !nearTransparent; d++) {
                    for (int dy = -d; dy <= d && !nearTransparent; dy++) {
                        for (int dx = -d; dx <= d; dx++) {
                            if (Math.Max(Math.Abs(dx), Math.Abs(dy)) != d) continue;
                            int nx = x + dx, ny = y + dy;
                            if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                            if (alpha[ny * W + nx] == 0) { nearTransparent = true; break; }
                        }
                    }
                }
                if (!nearTransparent) continue;
                int o = y * stride + x * 4;
                int maxC = Math.Max(bytes[o + 2], Math.Max(bytes[o + 1], bytes[o]));
                if (maxC < fringeMax) toClear.Add(i);
            }
        }
        foreach (int i in toClear) {
            int x = i % W, y = i / W;
            bytes[y * stride + x * 4 + 3] = 0;
            alpha[i] = 0;
        }

        // Pass 2: feather — alpha ramp for pixels near transparency
        for (int y = 0; y < H; y++) {
            for (int x = 0; x < W; x++) {
                int i = y * W + x;
                if (alpha[i] == 0) continue;
                // distance to nearest transparent pixel (BFS-lite: check ring 1..feather)
                int dist = feather + 1;
                for (int d = 1; d <= feather && dist > feather; d++) {
                    for (int dy = -d; dy <= d && dist > feather; dy++) {
                        for (int dx = -d; dx <= d; dx++) {
                            if (Math.Max(Math.Abs(dx), Math.Abs(dy)) != d) continue; // ring only
                            int nx = x + dx, ny = y + dy;
                            if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                            if (alpha[ny * W + nx] == 0) { dist = d; break; }
                        }
                    }
                }
                if (dist <= feather) {
                    int o = y * stride + x * 4;
                    // linear ramp: dist=1 -> 40% alpha, dist=feather -> ~85%
                    float t = (float)(dist - 1) / Math.Max(1, feather - 1);
                    int a = (int)(255 * (0.40f + 0.45f * t));
                    if (a < bytes[o + 3]) bytes[o + 3] = (byte)a;
                }
            }
        }
    }

    // BBox of opaque pixels per vertical segment. Returns "x,y,w,h;x,y,w,h;..."
    public static string BBoxes(byte[] bytes, int stride, int W, int H, int frames) {
        var result = new List<string>();
        int segW = W / frames;
        for (int f = 0; f < frames; f++) {
            int x0 = f * segW, x1 = (f == frames - 1) ? W : (f + 1) * segW;
            int minX = x1, maxX = -1, minY = H, maxY = -1;
            for (int y = 0; y < H; y++) {
                for (int x = x0; x < x1; x++) {
                    if (bytes[y * stride + x * 4 + 3] > 0) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            if (maxX < 0) throw new Exception("Frame " + f + " is empty");
            result.Add(minX + "," + minY + "," + (maxX - minX + 1) + "," + (maxY - minY + 1));
        }
        return string.Join(";", result.ToArray());
    }
}
"@

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

# Mode dispatch
$visited = New-Object bool[] ($W * $H)
if ($Mode -eq "chroma") {
    # Хромакей: помечаем ВСЕ зелёные пиксели глобально (в т.ч. замкнутые области
    # под столом/стулом, куда flood fill от краёв не добирается)
    $bgCount = [SpritePrep]::MarkAllChroma($bytes, $stride, $W, $H, $Tol, $visited)
} else {
    $bgCount = [SpritePrep]::Run($bytes, $stride, $W, $H, $Tol, $visited)
}
$pct = [Math]::Round(100.0 * $bgCount / ($W * $H), 1)
Write-Host "Background pixels: $bgCount of $($W * $H) ($pct%) [mode=$Mode]"

# Apply transparency (correct indexing: byte offset = y*stride + x*4)
for ($y = 0; $y -lt $H; $y++) {
    $row = $y * $stride
    for ($x = 0; $x -lt $W; $x++) {
        if ($visited[$y * $W + $x]) { $bytes[$row + $x * 4 + 3] = 0 }
    }
}

# Edge cleanup + feathering (fringe removal + soft edges).
# ВАЖНО: вызывать ДО создания $outImg — иначе смягчение не попадает
# в итоговый лист (именно из-за этого оставалась чёрная кайма по краям).
[SpritePrep]::SoftenEdges($bytes, $stride, $W, $H, 80, 4, 2)
Write-Host "Edges softened: fringe removed (maxC<80, ring 2px), feather 4px"

# Write alpha back
$outImg = [System.Drawing.Bitmap]::new($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$odata = $outImg.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $odata.Scan0, $bytes.Length)
$outImg.UnlockBits($odata)

# BBoxes (C#, fast)
$bboxesStr = [SpritePrep]::BBoxes($bytes, $stride, $W, $H, $Frames)
$boxes = @()
foreach ($part in $bboxesStr.Split(";")) {
    $n = $part.Split(",")
    $boxes += ,@([int]$n[0], [int]$n[1], [int]$n[2], [int]$n[3])
}
for ($f = 0; $f -lt $Frames; $f++) {
    $b = $boxes[$f]
    Write-Host ("Frame {0}: x={1} y={2} w={3} h={4}" -f $f, $b[0], $b[1], $b[2], $b[3])
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
