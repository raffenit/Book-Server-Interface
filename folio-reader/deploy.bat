@echo off
REM Folio Deployment Script (Windows Batch)
REM Usage: deploy.bat [port] [network]

set PORT=%1
if "%PORT%"=="" set PORT=3002

set NETWORK=%2
if "%NETWORK%"=="" set NETWORK=media-network

echo ========================================
echo Folio Deployment Script
echo ========================================
echo.

echo [1/4] Building Docker image...
docker build -t folio:latest .
if %errorlevel% neq 0 (
    echo Docker build failed!
    exit /b 1
)

echo.
echo [2/4] Stopping old container...
docker stop folio 2>nul
docker rm folio 2>nul
echo Old container removed.

echo.
echo [3/4] Starting new container on port %PORT%...
docker run -d --name folio --network %NETWORK% -p %PORT%:80 folio:latest
if %errorlevel% neq 0 (
    echo Failed to start container!
    exit /b 1
)

echo.
echo [4/4] Health check...
timeout /t 2 >nul
docker ps -f name=folio --format "{{.Status}}"

echo.
echo ========================================
echo Deployment complete!
echo Folio running at: http://localhost:%PORT%
echo ========================================
