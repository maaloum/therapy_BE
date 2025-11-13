# PowerShell Script to Test API Endpoints
# Usage: .\test-api.ps1

$apiUrl = "https://therapy-be.onrender.com/api"

Write-Host "=== Testing Therapy Platform API ===" -ForegroundColor Cyan
Write-Host ""

# Test Health Endpoint
Write-Host "1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$apiUrl/health" -Method Get
    Write-Host "✅ Health Check: OK" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
    Write-Host "   Timestamp: $($health.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test Registration
Write-Host "2. Testing Registration..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "test$timestamp@example.com"

$registerBody = @{
    firstName = "Test"
    lastName = "User"
    email = $testEmail
    password = "test123456"
    role = "CLIENT"
    preferredLanguage = "FRENCH"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$apiUrl/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $registerBody
    
    if ($registerResponse.success) {
        Write-Host "✅ Registration Successful!" -ForegroundColor Green
        Write-Host "   User ID: $($registerResponse.data.user.id)" -ForegroundColor Gray
        Write-Host "   Email: $($registerResponse.data.user.email)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Registration Failed: $($registerResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Registration Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Details: $($errorDetails.message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test Login
Write-Host "3. Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = "test123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody
    
    if ($loginResponse.success) {
        Write-Host "✅ Login Successful!" -ForegroundColor Green
        Write-Host "   Token received: $($loginResponse.data.token.Substring(0, 20))..." -ForegroundColor Gray
        $global:authToken = $loginResponse.data.token
    } else {
        Write-Host "❌ Login Failed: $($loginResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Login Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Details: $($errorDetails.message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test Protected Endpoint (if login was successful)
if ($global:authToken) {
    Write-Host "4. Testing Protected Endpoint (GET /api/auth/me)..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $global:authToken"
        }
        $meResponse = Invoke-RestMethod -Uri "$apiUrl/auth/me" `
            -Method Get `
            -Headers $headers
        
        if ($meResponse.success) {
            Write-Host "✅ Protected Endpoint Works!" -ForegroundColor Green
            Write-Host "   User: $($meResponse.data.firstName) $($meResponse.data.lastName)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Protected Endpoint Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "=== Testing Complete ===" -ForegroundColor Cyan

