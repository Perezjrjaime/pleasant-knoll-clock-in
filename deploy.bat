@echo off
echo Deploying Pleasant Knoll Clock-In App...
echo.

echo Step 1: Building the app...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed! Please check for errors.
    pause
    exit /b 1
)

echo.
echo Step 2: Build successful!
echo.
echo Next steps to complete deployment:
echo.
echo 1. Push to GitHub:
echo    git add .
echo    git commit -m "Ready for deployment"
echo    git push origin main
echo.
echo 2. Set up Azure Static Web Apps (follow DEPLOYMENT.md)
echo 3. Set up GitHub Pages (follow DEPLOYMENT.md)
echo.
echo Your app is ready for deployment!
pause