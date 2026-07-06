$port = 8080

# 防火墙放行
netsh advfirewall firewall add rule name="XiaoShu-8080" dir=in action=allow protocol=TCP localport=$port 2>$null

# 获取 IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Xiao Shu Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Local:  http://localhost:${port}/index.html"
if ($ip) {
    Write-Host "  Phone:  http://${ip}:${port}/index.html" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  Press Ctrl+C to stop"
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Set-Location $PSScriptRoot
python -m http.server $port

pause
