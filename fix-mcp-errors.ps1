# MCP Server Error Fix Script
# This script helps fix MCP server installation errors

Write-Host "=== MCP Server Error Fix Script ===" -ForegroundColor Cyan
Write-Host ""

# Check current Node.js version
Write-Host "Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "Current Node.js version: $nodeVersion" -ForegroundColor White

# Check if Node.js version is compatible
$nodeMajorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($nodeMajorVersion -lt 20) {
    Write-Host ""
    Write-Host "ERROR: Node.js version $nodeVersion is not compatible!" -ForegroundColor Red
    Write-Host "MCP server requires Node.js v20 or higher." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please upgrade Node.js using one of these methods:" -ForegroundColor Yellow
    Write-Host "1. Download from https://nodejs.org/ (recommended)" -ForegroundColor White
    Write-Host "2. Use nvm-windows: https://github.com/coreybutler/nvm-windows" -ForegroundColor White
    Write-Host "3. Use Chocolatey: choco install nodejs-lts" -ForegroundColor White
    Write-Host ""
    Write-Host "After upgrading, run this script again." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "Node.js version is compatible!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 1: Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force
if ($LASTEXITCODE -eq 0) {
    Write-Host "npm cache cleared successfully!" -ForegroundColor Green
} else {
    Write-Host "Warning: npm cache clean had issues, but continuing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 2: Clearing npx cache..." -ForegroundColor Yellow
$npxCachePath = "$env:LOCALAPPDATA\npm-cache\_npx"
if (Test-Path $npxCachePath) {
    Remove-Item -Recurse -Force $npxCachePath -ErrorAction SilentlyContinue
    Write-Host "npx cache cleared successfully!" -ForegroundColor Green
} else {
    Write-Host "npx cache directory not found (may already be cleared)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3: Testing MCP server installation..." -ForegroundColor Yellow
Write-Host "Running: npx -y @modelcontextprotocol/server-filesystem --version" -ForegroundColor Gray

# Try to get version (this will also trigger installation)
$output = npx -y @modelcontextprotocol/server-filesystem --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "MCP server installation successful!" -ForegroundColor Green
    Write-Host "Output: $output" -ForegroundColor Gray
} else {
    Write-Host "Warning: MCP server test had issues." -ForegroundColor Yellow
    Write-Host "Output: $output" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Try manually running:" -ForegroundColor Yellow
    Write-Host "  npx -y @modelcontextprotocol/server-filesystem" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Fix Script Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart Cursor completely (close all windows)" -ForegroundColor White
Write-Host "2. Check if MCP server is working in Cursor" -ForegroundColor White
Write-Host "3. Check the MCP logs if issues persist" -ForegroundColor White
Write-Host ""



