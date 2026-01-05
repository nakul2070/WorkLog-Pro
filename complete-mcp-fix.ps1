# Complete MCP Server Error Fix Script
# This script will attempt to fix all MCP-related errors

param(
    [switch]$SkipNodeCheck = $false,
    [switch]$Force = $false
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Complete MCP Server Error Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Node.js version
Write-Host "[1/7] Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "  Current version: $nodeVersion" -ForegroundColor White
$nodeMajorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')

if ($nodeMajorVersion -lt 20 -and -not $SkipNodeCheck) {
    Write-Host ""
    Write-Host "WARNING: Node.js version $nodeVersion is not compatible!" -ForegroundColor Red
    Write-Host "   MCP server requires Node.js v20 or higher." -ForegroundColor Red
    Write-Host ""
    Write-Host "Attempting to upgrade Node.js..." -ForegroundColor Yellow
    
    # Check for nvm-windows
    $nvmPath = Get-Command nvm -ErrorAction SilentlyContinue
    if ($nvmPath) {
        Write-Host "  Found nvm-windows, attempting to install Node.js v20..." -ForegroundColor Yellow
        nvm install 20
        if ($LASTEXITCODE -eq 0) {
            nvm use 20
            $nodeVersion = node --version
            Write-Host "  Node.js upgraded to $nodeVersion" -ForegroundColor Green
        } else {
            Write-Host "  Failed to install Node.js v20 via nvm" -ForegroundColor Red
            Write-Host ""
            Write-Host "Please manually upgrade Node.js:" -ForegroundColor Yellow
            Write-Host "  1. Download from https://nodejs.org/ (recommended)" -ForegroundColor White
            Write-Host "  2. Or use: nvm install 20; nvm use 20" -ForegroundColor White
            Write-Host ""
            Write-Host "After upgrading, run this script again with -SkipNodeCheck" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host ""
        Write-Host "Node.js version manager (nvm) not found." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please upgrade Node.js manually:" -ForegroundColor Yellow
        Write-Host "  1. Download Node.js v20 LTS from: https://nodejs.org/" -ForegroundColor White
        Write-Host "  2. Install it (this will replace your current version)" -ForegroundColor White
        Write-Host "  3. Restart your terminal/PowerShell" -ForegroundColor White
        Write-Host "  4. Run this script again" -ForegroundColor White
        Write-Host ""
        Write-Host "Or install nvm-windows first:" -ForegroundColor Yellow
        Write-Host "  Download from: https://github.com/coreybutler/nvm-windows/releases" -ForegroundColor White
        exit 1
    }
} else {
    Write-Host "  Node.js version is compatible!" -ForegroundColor Green
}

Write-Host ""

# Step 2: Clear npm cache
Write-Host "[2/7] Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  npm cache cleared" -ForegroundColor Green
} else {
    Write-Host "  npm cache clean had issues (continuing...)" -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Clear npx cache
Write-Host "[3/7] Clearing npx cache..." -ForegroundColor Yellow
$npxCachePath = "$env:LOCALAPPDATA\npm-cache\_npx"
if (Test-Path $npxCachePath) {
    try {
        Get-ChildItem $npxCachePath -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
        Remove-Item $npxCachePath -Force -Recurse -ErrorAction SilentlyContinue
        Write-Host "  npx cache cleared" -ForegroundColor Green
    } catch {
        Write-Host "  Some npx cache files could not be removed (may be in use)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  npx cache directory not found (already clean)" -ForegroundColor Green
}

Write-Host ""

# Step 4: Clear specific problematic cache folder
Write-Host "[4/7] Removing problematic cache folders..." -ForegroundColor Yellow
$problematicCache = "C:\Users\$env:USERNAME\AppData\Local\npm-cache\_npx\a3241bba59c344f5"
if (Test-Path $problematicCache) {
    try {
        Remove-Item -Recurse -Force $problematicCache -ErrorAction SilentlyContinue
        Write-Host "  Removed problematic cache folder" -ForegroundColor Green
    } catch {
        Write-Host "  Could not remove cache folder (may be in use)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Problematic cache folder not found" -ForegroundColor Green
}

Write-Host ""

# Step 5: Verify npm/npx are working
Write-Host "[5/7] Verifying npm and npx..." -ForegroundColor Yellow
$npmVersion = npm --version 2>&1
$npxVersion = npx --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  npm version: $npmVersion" -ForegroundColor Green
    Write-Host "  npx version: $npxVersion" -ForegroundColor Green
} else {
    Write-Host "  npm/npx verification had issues" -ForegroundColor Yellow
}

Write-Host ""

# Step 6: Test MCP server installation
Write-Host "[6/7] Testing MCP server installation..." -ForegroundColor Yellow
Write-Host "  Running: npx -y @modelcontextprotocol/server-filesystem --version" -ForegroundColor Gray

$output = npx -y @modelcontextprotocol/server-filesystem --version 2>&1
$installSuccess = $LASTEXITCODE -eq 0

if ($installSuccess) {
    Write-Host "  MCP server installed successfully!" -ForegroundColor Green
    Write-Host "  Version: $output" -ForegroundColor Gray
} else {
    Write-Host "  MCP server installation failed" -ForegroundColor Red
    Write-Host "  Error output:" -ForegroundColor Yellow
    $output | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
    
    # Try alternative installation method
    Write-Host ""
    Write-Host "  Attempting alternative installation method..." -ForegroundColor Yellow
    npm install -g @modelcontextprotocol/server-filesystem 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Installed via global npm install" -ForegroundColor Green
        $installSuccess = $true
    } else {
        Write-Host "  Alternative installation also failed" -ForegroundColor Red
    }
}

Write-Host ""

# Step 7: Verify MCP configuration
Write-Host "[7/7] Checking MCP configuration..." -ForegroundColor Yellow
$mcpConfigPath = ".\.cursor\mcp.json"
if (Test-Path $mcpConfigPath) {
    Write-Host "  MCP configuration file found" -ForegroundColor Green
    try {
        $mcpConfig = Get-Content $mcpConfigPath -Raw | ConvertFrom-Json
        Write-Host "  MCP configuration is valid JSON" -ForegroundColor Green
    } catch {
        Write-Host "  MCP configuration file may be invalid JSON" -ForegroundColor Yellow
    }
} else {
    Write-Host "  MCP configuration file not found at: $mcpConfigPath" -ForegroundColor Yellow
    Write-Host "  Creating default configuration..." -ForegroundColor Yellow
    
    $defaultConfig = @{
        mcpServers = @{
            filesystem = @{
                command = "npx"
                args = @("-y", "@modelcontextprotocol/server-filesystem")
            }
        }
    }
    
    $configDir = Split-Path $mcpConfigPath -Parent
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    
    $defaultConfig | ConvertTo-Json -Depth 10 | Set-Content $mcpConfigPath
    Write-Host "  Created default MCP configuration" -ForegroundColor Green
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fix Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($installSuccess) {
    Write-Host "All fixes completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Close ALL Cursor windows completely" -ForegroundColor White
    Write-Host "  2. Restart Cursor" -ForegroundColor White
    Write-Host "  3. Check MCP server status in Cursor settings" -ForegroundColor White
    Write-Host ""
    Write-Host "The MCP server should now be working!" -ForegroundColor Green
} else {
    Write-Host "Some issues remain:" -ForegroundColor Yellow
    Write-Host ""
    if ($nodeMajorVersion -lt 20) {
        Write-Host "  Node.js version is still incompatible" -ForegroundColor Red
        Write-Host "    Please upgrade to Node.js v20 or higher" -ForegroundColor White
    }
    if (-not $installSuccess) {
        Write-Host "  MCP server installation failed" -ForegroundColor Red
        Write-Host "    This is likely due to Node.js version incompatibility" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "  1. Upgrade Node.js to v20 or higher" -ForegroundColor White
    Write-Host "  2. Run this script again" -ForegroundColor White
    Write-Host "  3. Restart Cursor after successful installation" -ForegroundColor White
}

Write-Host ""



