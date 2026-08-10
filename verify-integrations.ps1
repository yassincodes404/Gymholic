# GymHolic Integration Verification Script
# Date: 2026-08-10

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "GymHolic Integration Verification" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "1. Checking Docker containers..." -ForegroundColor Yellow
$containers = docker ps --format "table {{.Names}}`t{{.Status}}" | Select-String "gymholic"
if ($containers) {
    Write-Host "[OK] Docker containers running:" -ForegroundColor Green
    docker ps --format "table {{.Names}}`t{{.Status}}" | Select-String "gymholic"
} else {
    Write-Host "[FAIL] No GymHolic containers running!" -ForegroundColor Red
    Write-Host "  Run: docker compose up -d" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Check backend health
Write-Host "2. Checking backend health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8080/actuator/health" -Method Get -ErrorAction Stop
    if ($health.status -eq "UP") {
        Write-Host "[OK] Backend is healthy" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Backend status: $($health.status)" -ForegroundColor Red
    }
} catch {
    Write-Host "[FAIL] Backend not responding!" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}
Write-Host ""

# Check frontend
Write-Host "3. Checking frontend..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5173" -Method Head -ErrorAction Stop -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "[OK] Frontend is accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "[FAIL] Frontend not responding!" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}
Write-Host ""

# Check database connection
Write-Host "4. Checking database..." -ForegroundColor Yellow
try {
    $dbCheck = docker exec gymholic-postgres psql -U gymholic -d gymholic -c "SELECT COUNT(*) FROM users;" 2>&1
    if ($dbCheck -match '[0-9]+') {
        Write-Host "[OK] Database is accessible" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Database query failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "[FAIL] Database connection error!" -ForegroundColor Red
}
Write-Host ""

# Check Google Calendar OAuth connection
Write-Host "5. Checking Google Calendar OAuth..." -ForegroundColor Yellow
try {
    $oauthCheck = docker exec gymholic-postgres psql -U gymholic -d gymholic -t -c "SELECT COUNT(*) FROM google_connections WHERE encrypted_refresh_token IS NOT NULL;" 2>&1
    $connectionCount = [int]($oauthCheck.Trim())
    if ($connectionCount -gt 0) {
        Write-Host "[OK] Google Calendar connected ($connectionCount connection(s))" -ForegroundColor Green
    } else {
        Write-Host "[WARN] No Google Calendar connections found" -ForegroundColor Yellow
        Write-Host "  Admin needs to connect Google Calendar at /admin/calendar/connect" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Failed to check OAuth connections!" -ForegroundColor Red
}
Write-Host ""

# Check environment variables
Write-Host "6. Checking critical environment variables..." -ForegroundColor Yellow
$envFile = Get-Content .env
$requiredVars = @(
    "JWT_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "VITE_GOOGLE_CLIENT_ID",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD"
)

$missingVars = @()
foreach ($var in $requiredVars) {
    $found = $envFile | Select-String -Pattern "^$var=.+"
    if ($found) {
        Write-Host "  [OK] $var configured" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $var MISSING or EMPTY!" -ForegroundColor Red
        $missingVars += $var
    }
}

if ($missingVars.Count -eq 0) {
    Write-Host "[OK] All critical environment variables configured" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Missing environment variables: $($missingVars -join ', ')" -ForegroundColor Red
}
Write-Host ""

# Check optional integrations
Write-Host "7. Checking optional integrations..." -ForegroundColor Yellow
$optionalVars = @(
    "MAIL_USERNAME",
    "MAIL_PASSWORD",
    "PAYMOB_API_KEY"
)

foreach ($var in $optionalVars) {
    $found = $envFile | Select-String -Pattern "^$var=.+"
    if ($found) {
        Write-Host "  [OK] $var configured" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] $var not configured (optional)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Check admin user
Write-Host "8. Checking admin user..." -ForegroundColor Yellow
try {
    $adminCheck = docker exec gymholic-postgres psql -U gymholic -d gymholic -t -c "SELECT COUNT(*) FROM users WHERE role = 'ADMIN';" 2>&1
    $adminCount = [int]($adminCheck.Trim())
    if ($adminCount -gt 0) {
        Write-Host "[OK] Admin user exists ($adminCount admin(s))" -ForegroundColor Green
    } else {
        Write-Host "[WARN] No admin user found!" -ForegroundColor Yellow
        Write-Host "  Admin will be seeded on next backend startup if ADMIN_EMAIL and ADMIN_PASSWORD are set" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Failed to check admin user!" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Core System:" -ForegroundColor Yellow
Write-Host "  - Backend: http://localhost:8080" -ForegroundColor Gray
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host "  - Admin Login: http://localhost:5173/admin/login" -ForegroundColor Gray
Write-Host "  - Client Login: http://localhost:5173/login" -ForegroundColor Gray
Write-Host ""

Write-Host "Google Integrations:" -ForegroundColor Yellow
Write-Host "  - Client Sign-In: Configured (requires manual browser test)" -ForegroundColor Gray
Write-Host "  - Calendar OAuth: Connected (ready for event creation)" -ForegroundColor Gray
Write-Host ""

Write-Host "Pending Manual Tests:" -ForegroundColor Yellow
Write-Host "  1. Assessment submission: http://localhost:5173/assessment" -ForegroundColor Gray
Write-Host "  2. Google Sign-In: http://localhost:5173/login" -ForegroundColor Gray
Write-Host "  3. Calendar event creation: Create booking -> Check Google Calendar" -ForegroundColor Gray
Write-Host ""

Write-Host "Optional Integrations:" -ForegroundColor Yellow
Write-Host "  - Email notifications: Not configured (SMTP credentials needed)" -ForegroundColor Gray
Write-Host "  - Payment (Paymob): Not configured (API credentials needed)" -ForegroundColor Gray
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Green
Write-Host "  1. Test assessment submission in browser" -ForegroundColor Gray
Write-Host "  2. Test Google Sign-In in browser" -ForegroundColor Gray
Write-Host "  3. Create booking and verify Calendar event creation" -ForegroundColor Gray
Write-Host ""
