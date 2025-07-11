@echo off
REM Batch script to fix better-sqlite3 for Electron on Windows
REM This script should be run in Windows Command Prompt, not WSL

echo Fixing better-sqlite3 for Electron...

REM Remove existing better-sqlite3
if exist "node_modules\better-sqlite3" (
    echo Removing existing better-sqlite3...
    rd /s /q "node_modules\better-sqlite3"
)

REM Set environment variables for Electron
set npm_config_runtime=electron
set npm_config_target=30.5.1
set npm_config_arch=x64
set npm_config_disturl=https://electronjs.org/headers
set npm_config_build_from_source=true

REM Install better-sqlite3
echo Installing better-sqlite3 with Electron configuration...
call npm install better-sqlite3 --save

REM Run electron-rebuild
echo Running electron-rebuild...
call npx electron-rebuild -f -w better-sqlite3

echo Done! Try running 'npm start' now.
pause