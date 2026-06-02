Add-Type -AssemblyName System.Drawing

$w = 1024
$h = 1024

# ---- helpers ---------------------------------------------------------
function New-RoundedPath {
    param([single]$x, [single]$y, [single]$rw, [single]$rh, [single]$radius)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $rw - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $rw - $d, $y + $rh - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $rh - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

# ---- canvas ----------------------------------------------------------
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

# ---- palette ---------------------------------------------------------
$cBgFrom   = [System.Drawing.Color]::FromArgb(230, 145, 56)    # #E69138
$cBgTo     = [System.Drawing.Color]::FromArgb(255, 153, 0)     # #FF9900
$cCalc     = [System.Drawing.Color]::FromArgb(255, 255, 255)
$cDisplay  = [System.Drawing.Color]::FromArgb(15, 36, 64)      # #0F2440
$cButton   = [System.Drawing.Color]::FromArgb(242, 244, 247)   # #F2F4F7
$cOp       = [System.Drawing.Color]::FromArgb(230, 145, 56)    # operator buttons
$cShadow   = [System.Drawing.Color]::FromArgb(40, 0, 0, 0)
$cBorder   = [System.Drawing.Color]::FromArgb(255, 230, 145, 56)

# ---- background (orange gradient inside full-canvas rounded rect) ----
$bgPath = New-RoundedPath 0 0 $w $h 224
$bgRect = New-Object System.Drawing.RectangleF 0, 0, $w, $h
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $bgRect, $cBgFrom, $cBgTo, 45
$g.FillPath($bgBrush, $bgPath)
$bgBrush.Dispose()
$bgPath.Dispose()

# ---- subtle inner shadow under calculator body ------------------------
$shadowPath = New-RoundedPath 232 192 560 680 64
$shadowBrush = New-Object System.Drawing.SolidBrush $cShadow
$g.FillPath($shadowBrush, $shadowPath)
$shadowBrush.Dispose()
$shadowPath.Dispose()

# ---- calculator body --------------------------------------------------
$calcPath = New-RoundedPath 232 172 560 680 64
$calcBrush = New-Object System.Drawing.SolidBrush $cCalc
$g.FillPath($calcBrush, $calcPath)
$calcBrush.Dispose()
$calcPath.Dispose()

# ---- display ----------------------------------------------------------
$dispPath = New-RoundedPath 296 236 432 180 24
$dispBrush = New-Object System.Drawing.SolidBrush $cDisplay
$g.FillPath($dispBrush, $dispPath)
$dispBrush.Dispose()
$dispPath.Dispose()

# ---- "JE" monogram on the display ------------------------------------
$font = New-Object System.Drawing.Font 'Arial Black', 110, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment     = [System.Drawing.StringAlignment]::Far
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$displayRect = New-Object System.Drawing.RectangleF 296, 236, 410, 180
$g.DrawString('JE', $font, $textBrush, $displayRect, $sf)
$textBrush.Dispose()
$font.Dispose()

# ---- button grid (4 cols x 3 rows) -----------------------------------
$btnW = 96
$btnH = 96
$btnR = 20
$cols = @(296, 408, 520, 632)
$rows = @(468, 580, 692)
foreach ($row in $rows) {
    foreach ($col in $cols) {
        $isOperator = ($col -eq 632)
        $fillColor = if ($isOperator) { $cOp } else { $cButton }
        $btnPath = New-RoundedPath $col $row $btnW $btnH $btnR
        $btnBrush = New-Object System.Drawing.SolidBrush $fillColor
        $g.FillPath($btnBrush, $btnPath)
        $btnBrush.Dispose()
        $btnPath.Dispose()
    }
}

# ---- save -------------------------------------------------------------
$out = 'C:\Users\hunte\OneDrive\Documents\Claude\Job Estimator\icon-1024.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

# ---- also build a 180x180 apple-touch and 192/512 manifest sizes -----
foreach ($size in @(180, 192, 512)) {
    $small = New-Object System.Drawing.Bitmap $size, $size
    $gs = [System.Drawing.Graphics]::FromImage($small)
    $gs.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $gs.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gs.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $src = [System.Drawing.Image]::FromFile($out)
    $gs.DrawImage($src, 0, 0, $size, $size)
    $smallOut = "C:\Users\hunte\OneDrive\Documents\Claude\Job Estimator\icon-$size.png"
    $small.Save($smallOut, [System.Drawing.Imaging.ImageFormat]::Png)
    $gs.Dispose()
    $small.Dispose()
    $src.Dispose()
}

Write-Output "Generated icons in $(Split-Path $out)"
