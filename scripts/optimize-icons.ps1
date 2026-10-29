Add-Type -AssemblyName System.Drawing

$publicDir = (Resolve-Path (Join-Path $PSScriptRoot "..\public")).Path
$ogSourcePath = Join-Path $publicDir "og-image.png"

# Load via MemoryStream so file is never locked
$bytes = [System.IO.File]::ReadAllBytes($ogSourcePath)
$ms = New-Object System.IO.MemoryStream(,$bytes)
$img = [System.Drawing.Image]::FromStream($ms)

function Resize-And-Save($srcImg, $targetPath, $width, $height) {
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($srcImg, 0, 0, $width, $height)
    $graphics.Dispose()
    
    $tempPath = $targetPath + ".tmp"
    $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    
    Move-Item -Path $tempPath -Destination $targetPath -Force
    $fileSize = (Get-Item $targetPath).Length
    Write-Host "Generated $targetPath ($width x $height): $fileSize bytes"
}

Resize-And-Save $img (Join-Path $publicDir "icon-512.png") 512 512
Resize-And-Save $img (Join-Path $publicDir "icon-192.png") 192 192
Resize-And-Save $img (Join-Path $publicDir "apple-touch-icon.png") 180 180
Resize-And-Save $img (Join-Path $publicDir "favicon.png") 64 64

$img.Dispose()
$ms.Dispose()
Write-Host "Icons generation completed successfully."
