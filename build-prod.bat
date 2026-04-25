@echo off
:: BrainHistory production build starter
:: Runs "next build --webpack" directly in the project directory.
:: The .next output stays in the project folder so that Node module
:: resolution works correctly during "collect page data".
::
:: Use this locally before deploying / testing a production build.

setlocal
set PROJ=C:\Users\2483483\OneDrive - Cognizant\Desktop\BrainHistory

echo [1/2] Clearing previous build output...
if exist "%PROJ%\.next" (
  :: Remove junction if one exists (legacy dev-start.bat artefact)
  powershell -NoProfile -Command "$p='%PROJ%\.next'; $i=Get-Item $p -ErrorAction SilentlyContinue; if($i -and $i.LinkType -eq 'Junction'){[System.IO.Directory]::Delete($p,$false)}elseif($i){Remove-Item $p -Recurse -Force}"
)

echo [2/2] Running next build...
cd /D "%PROJ%"
npm run build

echo.
if %ERRORLEVEL% EQU 0 (
  echo Build successful!
) else (
  echo Build failed with exit code %ERRORLEVEL%
)
