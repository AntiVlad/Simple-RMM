@echo off
echo ===================================
echo RMM Absolute Build System
echo ===================================

echo.
echo [1/4] Compiling the Unified Controller System Module (Go)...
if not exist "manager" mkdir manager
cd manager
if not exist "go.mod" (
    go env -w GO111MODULE=on
    go mod init rmm-manager
)
go get github.com/getlantern/systray
go get github.com/ncruces/zenity
go mod tidy
go build -ldflags "-H=windowsgui -s -w" -o RMM_Control_Center.exe main.go
move RMM_Control_Center.exe ..\RMM_Control_Center.exe
cd ..

echo.
echo [2/4] Assembling the Python Environment and Building standalone executable...
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt
pyinstaller -F --clean --hidden-import="uvicorn.logging" --hidden-import="uvicorn.loops" --hidden-import="uvicorn.loops.auto" --hidden-import="uvicorn.protocols" --hidden-import="uvicorn.protocols.http" --hidden-import="uvicorn.protocols.http.auto" --hidden-import="uvicorn.protocols.websockets" --hidden-import="uvicorn.protocols.websockets.auto" --hidden-import="uvicorn.lifespan" --hidden-import="uvicorn.lifespan.on" --hidden-import="fastapi" --hidden-import="asyncpg" --hidden-import="python-multipart" --hidden-import="dotenv" --hidden-import="pydantic_settings" main.py
move dist\main.exe ..\backend-server.exe
cd ..

echo.
echo [3/4] Compiling highly-optimized Next.js Dashboard Build Context...
cd frontend
call npm install
call npm run build
cd ..

echo.
echo [4/4] Compiling the RMM Node Agent Payload (Go)...
cd agent
go get github.com/getlantern/systray
go get github.com/ncruces/zenity
go mod tidy
go build -ldflags "-H=windowsgui -s -w" -o rmm_agent.exe main.go
move rmm_agent.exe ..\rmm_agent.exe
cd ..

echo.
echo ===================================
echo Master Assembly Complete
echo ===================================
echo All operations finished successfully. 
echo - Double click "RMM_Control_Center.exe" for the dashboard + database proxy.
echo - Deploy "rmm_agent.exe" to endpoint target computers natively!
echo.
pause
