@echo off
:: ============================================
:: RMM Agent Uninstaller
:: Just double-click to uninstall!
:: ============================================

:: Request admin privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo ========================================
echo   RMM Agent Uninstaller
echo ========================================
echo.

set "INSTALL_DIR=%ProgramFiles%\RMM Agent"
set "STARTUP=%ProgramData%\Microsoft\Windows\Start Menu\Programs\Startup"

echo [1/3] Stopping agent...
taskkill /IM rmm_agent.exe /F >nul 2>&1
timeout /t 1 /nobreak >nul
echo       Done.

echo [2/3] Removing startup registration...
:: Remove the elevated task
schtasks /delete /tn "RMMAgent" /f >nul 2>&1
:: Also remove legacy shortcut if present
if exist "%STARTUP%\RMM Agent.lnk" del "%STARTUP%\RMM Agent.lnk"
echo       Done.

echo [3/3] Removing installation folder...
if exist "%INSTALL_DIR%" (
    rmdir /S /Q "%INSTALL_DIR%"
    echo       Removed.
) else (
    echo       Not found, skipping.
)

echo.
echo ========================================
echo   Uninstallation Complete!
echo ========================================
echo.
pause
