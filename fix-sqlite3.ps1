# PowerShell script to fix better-sqlite3 for Electron on Windows
# This script should be run in Windows PowerShell, not WSL

Write-Host "Fixing better-sqlite3 for Electron..." -ForegroundColor Green

# Remove existing better-sqlite3
if (Test-Path "node_modules\better-sqlite3") {
    Write-Host "Removing existing better-sqlite3..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules\better-sqlite3
}

# Set environment variables for Electron
$env:npm_config_runtime = "electron"
$env:npm_config_target = "30.5.1"
$env:npm_config_arch = "x64"
$env:npm_config_disturl = "https://electronjs.org/headers"
$env:npm_config_build_from_source = "true"

# Install better-sqlite3
Write-Host "Installing better-sqlite3 with Electron configuration..." -ForegroundColor Yellow
npm install better-sqlite3 --save

# Run electron-rebuild
Write-Host "Running electron-rebuild..." -ForegroundColor Yellow
npx electron-rebuild -f -w better-sqlite3

Write-Host "Done! Try running 'npm start' now." -ForegroundColor Green