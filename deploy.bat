@echo off
echo ===================================
echo   RMM Server - One-Click Deploy
echo ===================================
echo.

:: Check Docker is available
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

:: Create .env from template if it doesn't exist
if not exist ".env" (
    echo [INFO] No .env file found. Creating from .env.example...
    copy .env.example .env >nul
    echo.
    echo ========================================
    echo   IMPORTANT: Edit your .env file now!
    echo ========================================
    echo.
    echo   Default credentials are insecure.
    echo   Open .env and change at minimum:
    echo     - AGENT_API_KEY
    echo     - DASHBOARD_PASSWORD
    echo     - JWT_SECRET
    echo.
    notepad .env
    echo Press any key after saving .env to continue...
    pause >nul
)

echo.
echo [1/3] Building and starting all services...
docker compose up -d --build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Docker Compose failed. Check the output above.
    pause
    exit /b 1
)

echo.
echo [2/3] Waiting for services to become healthy...
timeout /t 5 /nobreak >nul

:: Quick health check
curl -s http://localhost:8080/ >nul 2>&1
if %errorlevel% equ 0 (
    echo       Backend:  OK
) else (
    echo       Backend:  Starting up...
)

echo       Frontend: http://localhost:3000

echo.
echo [3/3] Opening dashboard in browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo ===================================
echo   RMM Server is running!
echo ===================================
echo.
echo   Dashboard:  http://localhost:3000
echo   Backend:    http://localhost:8080
echo.
echo   To stop:    docker compose down
echo   To restart: docker compose up -d
echo   View logs:  docker compose logs -f
echo.
pause
