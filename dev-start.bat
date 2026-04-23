@echo off
:: BrainHistory dev starter
:: Creates NTFS junctions to move Turbopack cache outside OneDrive (avoids
:: SST write failures and memory-mapped file conflicts caused by OneDrive sync).
::
:: Project: C:\Users\2483483\OneDrive - Cognizant\Desktop\BrainHistory
:: Cache target: %TEMP%\BrainHistory-next  (outside OneDrive, no sync)

setlocal
set PROJ=C:\Users\2483483\OneDrive - Cognizant\Desktop\BrainHistory
set CACHE=%TEMP%\BrainHistory-next

echo [1/4] Clearing previous cache...
if exist "%PROJ%\.next" (
  rmdir "%PROJ%\.next" 2>nul
  if exist "%PROJ%\.next" rmdir /S /Q "%PROJ%\.next" 2>nul
)
if exist "%CACHE%" rmdir /S /Q "%CACHE%"
mkdir "%CACHE%"

echo [2/4] Linking node_modules into cache dir...
mklink /J "%CACHE%\node_modules" "%PROJ%\node_modules"

echo [3/4] Linking .next -> cache dir...
mklink /J "%PROJ%\.next" "%CACHE%"

echo [4/4] Starting dev server...
cd /D "%PROJ%"
npm run dev
