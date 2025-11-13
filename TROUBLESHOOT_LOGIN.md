# Troubleshooting Login Issues

If you're getting "credentials not correct" when trying to log in with `admin@therapy.com / password123`, follow these steps:

## Step 1: Verify the Seed Script Was Run

The most common issue is that the database hasn't been seeded yet. Check if the admin user exists:

**Option A: Using PowerShell (from backend directory):**

```powershell
$env:DATABASE_URL="postgresql://therapy_auiw_user:SpiD1ZeoWOWskZdC3nK0QkMF80pUzeXP@dpg-d4b378npm1nc739j3fk0-a.oregon-postgres.render.com/therapy_auiw"
npx prisma studio
```

Then check if `admin@therapy.com` exists in the User table.

**Option B: Run the seed script:**

```powershell
cd backend
.\seed-production.ps1
```

Type `yes` when prompted to confirm.

## Step 2: Verify Password Hash

If the user exists but login still fails, the password hash might be incorrect. You can reset the admin password with this script:

Create `backend/reset-admin-password.js`:

```javascript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    const password = await bcrypt.hash("password123", 10);

    const admin = await prisma.user.update({
      where: { email: "admin@therapy.com" },
      data: { password },
    });

    console.log("✅ Admin password reset successfully!");
    console.log("Email:", admin.email);
  } catch (error) {
    if (error.code === "P2025") {
      console.log("❌ Admin user not found. Run the seed script first.");
    } else {
      console.error("Error:", error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
```

Then run:

```powershell
cd backend
$env:DATABASE_URL="postgresql://therapy_auiw_user:SpiD1ZeoWOWskZdC3nK0QkMF80pUzeXP@dpg-d4b378npm1nc739j3fk0-a.oregon-postgres.render.com/therapy_auiw"
node reset-admin-password.js
```

## Step 3: Test Login

After seeding or resetting the password, test the login:

```powershell
$body = @{
    email = "admin@therapy.com"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://therapy-be.onrender.com/api/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

## Common Issues

### Issue: "Invalid credentials"

- **Cause**: User doesn't exist or password is wrong
- **Solution**: Run the seed script

### Issue: "Email not verified"

- **Cause**: User exists but `isVerified` is `false`
- **Solution**: The seed script sets `isVerified: true` for admin, so this shouldn't happen if seeded correctly

### Issue: User exists but password doesn't work

- **Cause**: Password hash mismatch
- **Solution**: Run the reset password script above

## Quick Fix Script

Run this to seed the database (if not already done):

```powershell
cd backend
.\seed-production.ps1
```

Then try logging in again with:

- Email: `admin@therapy.com`
- Password: `password123`
