# Quick Fix Script for Login Loop Issue
# Run this in PowerShell from the project root

Write-Host "🔧 Quick Fix: Setting JWT_SECRET..." -ForegroundColor Cyan

# Check if backend-node/.env exists
if (Test-Path "backend-node\.env") {
    Write-Host "✅ Found backend-node\.env" -ForegroundColor Green
    
    # Check if JWT_SECRET exists
    $envContent = Get-Content "backend-node\.env" -Raw
    if ($envContent -match "JWT_SECRET=") {
        Write-Host "✅ JWT_SECRET already exists in .env" -ForegroundColor Green
        Write-Host "⚠️  But it might be invalid. Checking..." -ForegroundColor Yellow
        
        # Extract current JWT_SECRET
        $currentSecret = ($envContent -split "`n" | Select-String "JWT_SECRET=" | Out-String).Trim()
        Write-Host "Current: $currentSecret" -ForegroundColor Yellow
        
        # Check length
        $secretValue = $currentSecret -replace "JWT_SECRET=", ""
        if ($secretValue.Length -lt 32) {
            Write-Host "❌ JWT_SECRET is too short (less than 32 characters)!" -ForegroundColor Red
            Write-Host "Generating new secure secret..." -ForegroundColor Cyan
            $newSecret = node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
            
            # Replace in file
            $envContent = $envContent -replace "JWT_SECRET=.*", "JWT_SECRET=$newSecret"
            $envContent | Set-Content "backend-node\.env"
            Write-Host "✅ Updated JWT_SECRET with secure 128-character secret" -ForegroundColor Green
        } else {
            Write-Host "✅ JWT_SECRET length is adequate" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ JWT_SECRET not found in .env!" -ForegroundColor Red
        Write-Host "Generating secure secret..." -ForegroundColor Cyan
        
        # Generate new secret
        $newSecret = node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
        
        # Append to .env
        Add-Content "backend-node\.env" "`nJWT_SECRET=$newSecret"
        Write-Host "✅ Added JWT_SECRET to .env" -ForegroundColor Green
    }
} else {
    Write-Host "❌ backend-node\.env not found!" -ForegroundColor Red
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    
    $newSecret = node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
    
    @"
PORT=8001
NODE_ENV=development
CORS_ORIGIN=*

# Database Configuration
DB_HOST=ai-test-rds.czndytgw4opr.us-east-1.rds.amazonaws.com
DB_PORT=63792
DB_USER=dev-db-kltimesheetmgmt-db-user
DB_PASSWORD="Ndh7p2E2si64#DM"
DB_NAME=dev-db-kltimesheetmgmt
DB_CONNECTION_LIMIT=10

# JWT Configuration
JWT_SECRET=$newSecret
FRONTEND_URL=http://localhost:3000
"@ | Set-Content "backend-node\.env"
    
    Write-Host "✅ Created .env with JWT_SECRET" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔄 Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your backend server (Ctrl+C then 'npm start')" -ForegroundColor White
Write-Host "2. Clear browser storage: Open DevTools > Application > Local Storage > Clear" -ForegroundColor White
Write-Host "3. Login again" -ForegroundColor White
Write-Host ""
Write-Host "✅ JWT_SECRET is now configured!" -ForegroundColor Green















