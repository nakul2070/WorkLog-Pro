# Test Role-Based Login
# This script tests the three different user roles

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   ROLE-BASED LOGIN TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

function Test-Login {
    param(
        [string]$Name,
        [string]$Email,
        [string]$ExpectedRole
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "Email: $Email" -ForegroundColor Gray
    
    try {
        $body = @{ email = $Email } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "http://localhost:8001/api/auth/test-login" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
        
        if ($response.success) {
            Write-Host "  ✅ Login Successful" -ForegroundColor Green
            Write-Host "  User: $($response.user.name)"
            Write-Host "  Email: $($response.user.email)"
            Write-Host "  Is Admin: $($response.user.isAdmin)" -ForegroundColor $(if ($response.user.isAdmin) { "Green" } else { "Gray" })
            Write-Host "  Is PM: $($response.user.isProjectManager)" -ForegroundColor $(if ($response.user.isProjectManager) { "Green" } else { "Gray" })
            Write-Host "  Token: $($response.token.Substring(0,40))..." -ForegroundColor DarkGray
            Write-Host ""
            return $true
        } else {
            Write-Host "  ❌ Login Failed: $($response.error)" -ForegroundColor Red
            Write-Host ""
            return $false
        }
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        return $false
    }
}

# Test 1: Employee
$test1 = Test-Login -Name "Alice Johnson (Employee)" -Email "alice.johnson@kadellabs.com" -ExpectedRole "Employee"

# Test 2: Project Manager
$test2 = Test-Login -Name "Michael Chen (Project Manager)" -Email "michael.chen@kadellabs.com" -ExpectedRole "Project Manager"

# Test 3: Admin
$test3 = Test-Login -Name "Sarah Johnson (Admin)" -Email "sarah.johnson@kadellabs.com" -ExpectedRole "Admin"

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Employee Test:          $(if ($test1) { '✅ PASS' } else { '❌ FAIL' })" -ForegroundColor $(if ($test1) { "Green" } else { "Red" })
Write-Host "Project Manager Test:   $(if ($test2) { '✅ PASS' } else { '❌ FAIL' })" -ForegroundColor $(if ($test2) { "Green" } else { "Red" })
Write-Host "Admin Test:             $(if ($test3) { '✅ PASS' } else { '❌ FAIL' })" -ForegroundColor $(if ($test3) { "Green" } else { "Red" })

$allPassed = $test1 -and $test2 -and $test3
Write-Host "`nOverall Status: $(if ($allPassed) { '✅ ALL TESTS PASSED' } else { '❌ SOME TESTS FAILED' })" -ForegroundColor $(if ($allPassed) { "Green" } else { "Red" })
Write-Host ""

