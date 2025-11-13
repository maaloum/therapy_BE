# PowerShell script to check if admin user exists in database
# Usage: .\check-user.ps1

Write-Host "Checking if admin user exists..." -ForegroundColor Yellow
Write-Host ""

# Set DATABASE_URL
$defaultDbUrl = "postgresql://therapy_auiw_user:SpiD1ZeoWOWskZdC3nK0QkMF80pUzeXP@dpg-d4b378npm1nc739j3fk0-a.oregon-postgres.render.com/therapy_auiw"

# Try to load from .env first
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^DATABASE_URL=(.+)$') {
            $env:DATABASE_URL = $matches[1]
        }
    }
}

# If not set from .env, use default
if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = $defaultDbUrl
}

Write-Host "Connecting to database..." -ForegroundColor Yellow

# Create a temporary Node.js script to check the user
$checkScript = @"
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@therapy.com' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        createdAt: true
      }
    });
    
    if (user) {
      console.log('User found:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('User not found!');
      console.log('You need to run the seed script first.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.`$disconnect();
  }
}

checkUser();
"@

$checkScript | Out-File -FilePath "check-user-temp.js" -Encoding UTF8

try {
    node check-user-temp.js
} catch {
    Write-Host "Error running check: $_" -ForegroundColor Red
} finally {
    if (Test-Path "check-user-temp.js") {
        Remove-Item "check-user-temp.js"
    }
}

