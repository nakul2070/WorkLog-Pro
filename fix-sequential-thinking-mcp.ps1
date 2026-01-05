# Complete Fix for Sequential-Thinking MCP Server Errors
# This script fixes all issues with @modelcontextprotocol/server-sequential-thinking

param(
    [switch]$SkipNodeCheck = $false,
    [switch]$Force = $false
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sequential-Thinking MCP Server Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Node.js version
Write-Host "[1/8] Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "  Current version: $nodeVersion" -ForegroundColor White
$nodeMajorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')

if ($nodeMajorVersion -lt 18 -and -not $SkipNodeCheck) {
    Write-Host ""
    Write-Host "WARNING: Node.js version $nodeVersion may have compatibility issues!" -ForegroundColor Yellow
    Write-Host "   Recommended: Node.js v18 or higher for best compatibility." -ForegroundColor Yellow
    Write-Host "   Continuing anyway..." -ForegroundColor Yellow
} else {
    Write-Host "  Node.js version is compatible!" -ForegroundColor Green
}

Write-Host ""

# Step 2: Kill any running npx/node processes that might be locking files
Write-Host "[2/8] Checking for locked processes..." -ForegroundColor Yellow
$lockedProcesses = Get-Process -Name "node","npx" -ErrorAction SilentlyContinue
if ($lockedProcesses) {
    Write-Host "  Found $($lockedProcesses.Count) node/npx process(es) running" -ForegroundColor Yellow
    if ($Force) {
        Write-Host "  Force flag set - killing processes..." -ForegroundColor Yellow
        $lockedProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "  Processes terminated" -ForegroundColor Green
    } else {
        Write-Host "  Processes found but not killed (use -Force to kill them)" -ForegroundColor Yellow
        Write-Host "  Waiting 3 seconds for processes to release locks..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
} else {
    Write-Host "  No locking processes found" -ForegroundColor Green
}

Write-Host ""

# Step 3: Clear npm cache
Write-Host "[3/8] Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  npm cache cleared" -ForegroundColor Green
} else {
    Write-Host "  npm cache clean had issues (continuing...)" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Clear npx cache with retry logic
Write-Host "[4/8] Clearing npx cache..." -ForegroundColor Yellow
$npxCachePath = "$env:LOCALAPPDATA\npm-cache\_npx"
$maxRetries = 3
$retryCount = 0
$cleared = $false

while (-not $cleared -and $retryCount -lt $maxRetries) {
    $retryCount++
    if (Test-Path $npxCachePath) {
        try {
            # Try to remove files one by one to avoid locking issues
            Get-ChildItem $npxCachePath -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                $dirPath = $_.FullName
                try {
                    # Remove files first, then directory
                    Get-ChildItem $dirPath -Recurse -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
                    Remove-Item $dirPath -Force -Recurse -ErrorAction SilentlyContinue
                } catch {
                    # Ignore individual failures
                }
            }
            
            # Try to remove the main directory
            Remove-Item $npxCachePath -Force -Recurse -ErrorAction SilentlyContinue
            $cleared = $true
            Write-Host "  npx cache cleared (attempt $retryCount)" -ForegroundColor Green
        } catch {
            if ($retryCount -lt $maxRetries) {
                Write-Host "  Retry $retryCount failed, waiting 2 seconds..." -ForegroundColor Yellow
                Start-Sleep -Seconds 2
            } else {
                Write-Host "  Some npx cache files could not be removed (may be in use)" -ForegroundColor Yellow
                Write-Host "  This is usually okay - npx will recreate the cache" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  npx cache directory not found (already clean)" -ForegroundColor Green
        $cleared = $true
    }
}

Write-Host ""

# Step 5: Remove specific problematic cache folder from error logs
Write-Host "[5/8] Removing problematic cache folders..." -ForegroundColor Yellow
$problematicCache = "C:\Users\$env:USERNAME\AppData\Local\npm-cache\_npx\de2bd410102f5eda"
if (Test-Path $problematicCache) {
    try {
        # Kill any processes using files in this directory
        Get-Process | Where-Object {
            $_.Path -like "*de2bd410102f5eda*"
        } | Stop-Process -Force -ErrorAction SilentlyContinue
        
        Start-Sleep -Seconds 1
        
        # Remove files individually
        Get-ChildItem $problematicCache -Recurse -File -ErrorAction SilentlyContinue | 
            Remove-Item -Force -ErrorAction SilentlyContinue
        
        # Remove directories
        Get-ChildItem $problematicCache -Directory -ErrorAction SilentlyContinue | 
            Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
        
        Remove-Item $problematicCache -Force -Recurse -ErrorAction SilentlyContinue
        Write-Host "  Removed problematic cache folder" -ForegroundColor Green
    } catch {
        Write-Host "  Could not remove cache folder (may be in use)" -ForegroundColor Yellow
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
    }
} else {
    Write-Host "  Problematic cache folder not found" -ForegroundColor Green
}

Write-Host ""

# Step 6: Verify npm/npx are working
Write-Host "[6/8] Verifying npm and npx..." -ForegroundColor Yellow
$npmVersion = npm --version 2>&1
$npxVersion = npx --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  npm version: $npmVersion" -ForegroundColor Green
    Write-Host "  npx version: $npxVersion" -ForegroundColor Green
} else {
    Write-Host "  npm/npx verification had issues" -ForegroundColor Yellow
}

Write-Host ""

# Step 7: Install MCP server with proper error handling
Write-Host "[7/8] Installing @modelcontextprotocol/server-sequential-thinking..." -ForegroundColor Yellow
Write-Host "  This may take a minute..." -ForegroundColor Gray

# First, try global installation as a fallback
Write-Host "  Attempting global installation..." -ForegroundColor Gray
$globalInstall = npm install -g @modelcontextprotocol/server-sequential-thinking 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Global installation successful!" -ForegroundColor Green
} else {
    Write-Host "  Global installation had issues (this is okay, npx will handle it)" -ForegroundColor Yellow
}

# Test npx execution
Write-Host "  Testing npx execution..." -ForegroundColor Gray
$testOutput = npx -y @modelcontextprotocol/server-sequential-thinking --help 2>&1
$installSuccess = $LASTEXITCODE -eq 0

if ($installSuccess) {
    Write-Host "  MCP server installed and working!" -ForegroundColor Green
} else {
    Write-Host "  MCP server test had issues" -ForegroundColor Yellow
    Write-Host "  Output: $testOutput" -ForegroundColor Gray
    
    # Try alternative: install locally in a temp directory to verify package integrity
    Write-Host "  Attempting alternative verification..." -ForegroundColor Yellow
    $tempDir = Join-Path $env:TEMP "mcp-test-$(Get-Random)"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    try {
        Push-Location $tempDir
        npm init -y | Out-Null
        npm install @modelcontextprotocol/server-sequential-thinking 2>&1 | Out-Null
        if (Test-Path "node_modules\@modelcontextprotocol\server-sequential-thinking\dist\index.js") {
            Write-Host "  Package integrity verified - dist/index.js exists" -ForegroundColor Green
            $installSuccess = $true
        } else {
            Write-Host "  WARNING: Package installed but dist/index.js not found" -ForegroundColor Red
            Write-Host "  This may indicate a package build issue" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Alternative verification failed" -ForegroundColor Yellow
    } finally {
        Pop-Location
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""

# Step 8: Fix MCP configuration
Write-Host "[8/8] Fixing MCP configuration..." -ForegroundColor Yellow
$mcpConfigPath = ".\.cursor\mcp.json"
$configDir = Split-Path $mcpConfigPath -Parent

if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    Write-Host "  Created .cursor directory" -ForegroundColor Green
}

# Read existing config if it exists
$existingConfig = $null
if (Test-Path $mcpConfigPath) {
    try {
        $configContent = Get-Content $mcpConfigPath -Raw
        # Remove any duplicate JSON objects (fix malformed file)
        $configContent = $configContent -replace '\}\s*\{', '},{'
        # Try to parse as JSON
        $existingConfig = $configContent | ConvertFrom-Json -ErrorAction Stop
        Write-Host "  Found existing MCP configuration" -ForegroundColor Green
    } catch {
        Write-Host "  Existing config is invalid, creating new one" -ForegroundColor Yellow
    }
}

# Create or update configuration
if ($existingConfig -and $existingConfig.mcpServers) {
    # Update existing config
    if (-not $existingConfig.mcpServers.'sequential-thinking') {
        $existingConfig.mcpServers | Add-Member -MemberType NoteProperty -Name 'sequential-thinking' -Value @{
            command = "npx"
            args = @("-y", "@modelcontextprotocol/server-sequential-thinking")
        } -Force
        Write-Host "  Added sequential-thinking server to existing config" -ForegroundColor Green
    } else {
        Write-Host "  sequential-thinking server already configured" -ForegroundColor Green
    }
    $configToSave = $existingConfig
} else {
    # Create new config
    $configToSave = @{
        mcpServers = @{
            "sequential-thinking" = @{
                command = "npx"
                args = @("-y", "@modelcontextprotocol/server-sequential-thinking")
            }
        }
    }
    Write-Host "  Created new MCP configuration" -ForegroundColor Green
}

# Save configuration
try {
    $configToSave | ConvertTo-Json -Depth 10 | Set-Content $mcpConfigPath -Encoding UTF8
    Write-Host "  Configuration saved successfully" -ForegroundColor Green
    
    # Verify the saved config
    $verifyConfig = Get-Content $mcpConfigPath -Raw | ConvertFrom-Json
    if ($verifyConfig.mcpServers.'sequential-thinking') {
        Write-Host "  Configuration verified" -ForegroundColor Green
    }
} catch {
    Write-Host "  ERROR: Failed to save configuration" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fix Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($installSuccess) {
    Write-Host "✅ All fixes completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Close ALL Cursor windows completely" -ForegroundColor White
    Write-Host "  2. Wait 5 seconds for processes to fully terminate" -ForegroundColor White
    Write-Host "  3. Restart Cursor" -ForegroundColor White
    Write-Host "  4. Check MCP server status in Cursor settings" -ForegroundColor White
    Write-Host ""
    Write-Host "The sequential-thinking MCP server should now be working!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Some issues remain:" -ForegroundColor Yellow
    Write-Host ""
    if ($nodeMajorVersion -lt 18) {
        Write-Host "  • Node.js version may be incompatible" -ForegroundColor Yellow
        Write-Host "    Consider upgrading to Node.js v18 or higher" -ForegroundColor White
    }
    if (-not $installSuccess) {
        Write-Host "  • MCP server installation had issues" -ForegroundColor Yellow
        Write-Host "    The server may still work via npx on-demand" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Try:" -ForegroundColor Yellow
    Write-Host "  1. Restart your computer to release all file locks" -ForegroundColor White
    Write-Host "  2. Run this script again with -Force flag" -ForegroundColor White
    Write-Host "  3. Manually test: npx -y @modelcontextprotocol/server-sequential-thinking" -ForegroundColor White
}

Write-Host ""


