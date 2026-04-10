@echo off
:: ============================================
:: RMM Agent Installer
:: Just double-click to install!
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
echo   RMM Agent Installer
echo ========================================
echo.

set "INSTALL_DIR=%ProgramFiles%\RMM Agent"
set "EXE_NAME=rmm_agent.exe"
set "SOURCE=%~dp0%EXE_NAME%"
set "STARTUP=%ProgramData%\Microsoft\Windows\Start Menu\Programs\Startup"

:: Check source exists
if not exist "%SOURCE%" (
    echo [ERROR] Cannot find %EXE_NAME% next to this installer.
    echo Make sure you built it first with build_rmm.bat
    pause
    exit /b 1
)

:: Kill running agent
echo [1/4] Stopping any running agent...
taskkill /IM rmm_agent.exe /F >nul 2>&1
timeout /t 1 /nobreak >nul

:: Create install dir and copy
echo [2/4] Installing to %INSTALL_DIR%...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
copy /Y "%SOURCE%" "%INSTALL_DIR%\%EXE_NAME%" >nul
echo       Done.

:: Create elevated scheduled task for UAC-free Admin startup
echo [3/4] Registering elevated startup task...
:: Remove old legacy shortcut if it exists
if exist "%STARTUP%\RMM Agent.lnk" del "%STARTUP%\RMM Agent.lnk"
:: Create the task: Run at logon, Highest privileges, Interactive
schtasks /create /tn "RMMAgent" /tr "'%INSTALL_DIR%\%EXE_NAME%'" /sc onlogon /rl highest /it /f >nul
echo       Done. Agent will start as Admin (no UAC prompt) on every logon.

:: Launch now
echo [4/4] Launching agent...
start "" "%INSTALL_DIR%\%EXE_NAME%"

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo   Location:    %INSTALL_DIR%
echo   Auto-start:  Enabled
echo   Status:      Running in system tray
echo.
pause
