@echo off
echo ===================================
echo   RMM Agent Build
echo ===================================
echo.
echo This script compiles the agent executable
echo that gets deployed to endpoint PCs.
echo.
echo Prerequisites: Go 1.21+
echo.

echo [1/1] Compiling the RMM Agent (Go)...
cd agent
if not exist "go.mod" (
    go env -w GO111MODULE=on
    go mod init rmm-agent
)
go get github.com/getlantern/systray
go get github.com/ncruces/zenity
go mod tidy
go build -ldflags "-H=windowsgui -s -w" -o rmm_agent.exe main.go
move rmm_agent.exe ..\rmm_agent.exe
cd ..

echo.
echo ===================================
echo   Build Complete
echo ===================================
echo.
echo   Output: rmm_agent.exe
echo.
echo   To install on endpoints, copy these files
echo   to the target PC and run install_agent.bat:
echo     - rmm_agent.exe
echo     - install_agent.bat
echo.
pause
