@echo off
cd /d "%~dp0"

netsh advfirewall firewall add rule name="XiaoShu-8080" dir=in action=allow protocol=TCP localport=8080 >nul 2>nul

echo ========================================
echo   Xiao Shu Server
echo ========================================
echo.
echo   Local:  http://localhost:8080/index.html
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4" ^| findstr /V "169.254"') do (
    set TMP_IP=%%a
    goto :found
)
goto :start

:found
set TMP_IP=%TMP_IP: =%
echo   Phone:  http://%TMP_IP%:8080/index.html

:start
echo.
echo   Press Ctrl+C to stop
echo ========================================
echo.

python -m http.server 8080

pause
