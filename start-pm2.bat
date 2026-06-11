@echo off
setlocal
cd /d "%~dp0"

echo Building vendor portal...
call npm run build
if errorlevel 1 (
  echo Build failed.
  exit /b 1
)

echo Starting vendor portal with PM2...
pm2 delete nextjs-vendor-app 2>nul
call npm run start:pm2
pm2 save

echo.
echo Vendor portal running: http://localhost:3003
echo Logs: pm2 logs nextjs-vendor-app
endlocal
