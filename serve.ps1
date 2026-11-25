# ============================================================
#  Timetable Generator — Local Network HTTP Server
# ============================================================

$webRoot = "$PSScriptRoot\web"
$ip      = "172.20.10.2"   # Your Wi-Fi IP — change if needed
$port    = 8080
$prefix  = "http://$ip`:$port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Prefixes.Add("http://localhost:$port/")

try { $listener.Start() }
catch {
    Write-Host "ERROR: Could not start server. Try running as Administrator." -ForegroundColor Red
    exit 1
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
    ".svg"  = "image/svg+xml"
    ".woff2"= "font/woff2"
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  TIMETABLE GENERATOR — Local Network Server Running" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Open on THIS PC:     http://localhost:$port/" -ForegroundColor Green
Write-Host "  Open on MOBILE:      http://$ip`:$port/" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Make sure your phone is on the SAME Wi-Fi network!" -ForegroundColor White
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Gray
Write-Host ""

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request  = $context.Request
    $response = $context.Response

    $rawUrl = $request.Url.LocalPath
    if ($rawUrl -eq "/" -or $rawUrl -eq "") { $rawUrl = "/index.html" }

    # Sanitise path (prevent directory traversal)
    $filePath = Join-Path $webRoot ($rawUrl.TrimStart("/").Replace("/", "\"))
    $filePath = [System.IO.Path]::GetFullPath($filePath)

    if (-not $filePath.StartsWith($webRoot)) {
        $response.StatusCode = 403
        $response.Close()
        continue
    }

    Write-Host "$(Get-Date -f 'HH:mm:ss')  $($request.HttpMethod)  $rawUrl" -ForegroundColor DarkGray

    if (Test-Path $filePath -PathType Leaf) {
        $ext  = [System.IO.Path]::GetExtension($filePath).ToLower()
        $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
        $bytes = [System.IO.File]::ReadAllBytes($filePath)

        $response.StatusCode = 200
        $response.ContentType   = $mime
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $body  = [System.Text.Encoding]::UTF8.GetBytes("<h2>404 Not Found</h2><p>$rawUrl</p>")
        $response.StatusCode = 404
        $response.ContentType = "text/html"
        $response.ContentLength64 = $body.Length
        $response.OutputStream.Write($body, 0, $body.Length)
    }

    $response.OutputStream.Flush()
    $response.Close()
}
