# PowerShell script to seed production database on Render
# Usage: .\seed-production.ps1

Write-Host "Database Seeding Script for Render" -ForegroundColor Green
Write-Host ""

# Set DATABASE_URL
$defaultDbUrl = "postgresql://therapy_auiw_user:SpiD1ZeoWOWskZdC3nK0QkMF80pUzeXP@dpg-d4b378npm1nc739j3fk0-a.oregon-postgres.render.com/therapy_auiw"

# Try to load from .env first (if you want to override)
if (Test-Path ".env") {
    Write-Host "Checking .env file..." -ForegroundColor Yellow
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^DATABASE_URL=(.+)$') {
            $env:DATABASE_URL = $matches[1]
            Write-Host "Using DATABASE_URL from .env" -ForegroundColor Green
        }
    }
}

# If not set from .env, use the default Render database URL
if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = $defaultDbUrl
    Write-Host "Using Render DATABASE_URL" -ForegroundColor Green
}

# Verify DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "DATABASE_URL is not set!" -ForegroundColor Red
    exit 1
}

# Confirm before proceeding
Write-Host ""
Write-Host "WARNING: This will DELETE all existing data and seed new data!" -ForegroundColor Yellow
$confirm = Read-Host "Are you sure you want to continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Seeding cancelled." -ForegroundColor Red
    exit 0
}

# Navigate to backend directory (if not already there)
$currentDir = Get-Location
$currentDirName = Split-Path -Leaf $currentDir.Path
if ($currentDirName -ne "backend") {
    if (Test-Path "backend") {
        Set-Location -Path "backend"
    } elseif (Test-Path "..\backend") {
        Set-Location -Path "..\backend"
    }
}

# Run seed
Write-Host ""
Write-Host "Starting database seeding..." -ForegroundColor Green
Write-Host ""

try {
    npm run prisma:seed
    Write-Host ""
    Write-Host "Seeding completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test Accounts:" -ForegroundColor Cyan
    Write-Host "   Admin: admin@therapy.com / password123"
    Write-Host "   Doctors: doctor1@therapy.com to doctor15@therapy.com / password123"
    Write-Host "   Clients: client1@therapy.com to client30@therapy.com / password123"
} catch {
    Write-Host ""
    Write-Host "Seeding failed: $_" -ForegroundColor Red
    exit 1
} finally {
    # Reset location
    $finalDirName = Split-Path -Leaf (Get-Location).Path
    if ($finalDirName -ne (Split-Path -Leaf $currentDir.Path)) {
        Set-Location -Path $currentDir
    }
}
