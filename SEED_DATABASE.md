# How to Seed the Database

This guide explains how to seed your database with sample data for development and testing.

## What Gets Seeded

The seed script creates:

- **1 Admin user**: `admin@therapy.com` / `password123`
- **15 Doctors**: `doctor1@therapy.com` to `doctor15@therapy.com` / `password123`
- **30 Clients**: `client1@therapy.com` to `client30@therapy.com` / `password123`
- **Bookings**: 2-5 bookings per client with various statuses
- **Reviews**: Reviews for completed bookings
- **Payments**: Payments for confirmed/completed bookings
- **Messages**: Sample messages between clients and doctors
- **Doctor Statistics**: Statistics for each doctor

⚠️ **Warning**: The seed script **deletes all existing data** before seeding. Use with caution!

## Local Seeding

### Prerequisites

1. Make sure your database is running and accessible
2. Ensure migrations have been run: `npx prisma migrate deploy --schema=./prisma/schema.prisma`
3. Set your `DATABASE_URL` in `.env` file

### Method 1: Using npm script (Recommended)

From the `backend` directory:

```bash
npm run prisma:seed
```

### Method 2: Using Prisma CLI

```bash
npx prisma db seed --schema=./prisma/schema.prisma
```

### Method 3: Direct Node execution

```bash
node prisma/seed.js
```

## Seeding Production Database (Render)

Since Render's free tier doesn't support shell access, you'll need to run the seed script from your local machine, pointing to your production database.

### Step 1: Get Your Production DATABASE_URL

1. Go to your Render dashboard
2. Navigate to your PostgreSQL database
3. Copy the **Internal Database URL** (for services in the same region) or **External Database URL** (for local access)

### Step 2: Set Environment Variable

**Windows PowerShell:**

```powershell
cd backend
$env:DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
npm run prisma:seed
```

**Windows Command Prompt:**

```cmd
cd backend
set DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
npm run prisma:seed
```

**Linux/Mac:**

```bash
cd backend
export DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
npm run prisma:seed
```

### Step 3: Verify Seeding

After seeding, test the API:

```bash
# Test health endpoint
curl https://therapy-be.onrender.com/api/health

# Test login with seeded admin
curl -X POST https://therapy-be.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapy.com","password":"password123"}'
```

## Quick PowerShell Script for Render Seeding

Create a file `backend/seed-production.ps1`:

```powershell
# Get DATABASE_URL from user
$dbUrl = Read-Host "Enter your Render DATABASE_URL"

# Set environment variable
$env:DATABASE_URL = $dbUrl

# Navigate to backend directory
Set-Location -Path "backend"

# Run seed
Write-Host "🌱 Seeding production database..." -ForegroundColor Green
npm run prisma:seed

# Reset location
Set-Location -Path ".."
```

Then run:

```powershell
.\backend\seed-production.ps1
```

## Troubleshooting

### "Cannot find module '@prisma/client'"

Make sure Prisma client is generated:

```bash
npx prisma generate --schema=./prisma/schema.prisma
```

### "Database connection failed"

- Verify `DATABASE_URL` is correct
- Check if database is accessible from your network
- For Render external URLs, ensure your IP is whitelisted (if required)
- Try using the Internal Database URL if seeding from a Render service

### "Table does not exist"

Run migrations first:

```bash
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### "Unique constraint violation"

The seed script deletes all data first, but if it fails partway through, you might have partial data. You can:

1. Manually delete data using Prisma Studio:

   ```bash
   npx prisma studio --schema=./prisma/schema.prisma
   ```

2. Or run the seed script again (it will delete and recreate)

## Test Accounts

After seeding, you can use these accounts:

**Admin:**

- Email: `admin@therapy.com`
- Password: `password123`

**Doctors:**

- Email: `doctor1@therapy.com` to `doctor15@therapy.com`
- Password: `password123`

**Clients:**

- Email: `client1@therapy.com` to `client30@therapy.com`
- Password: `password123`

## Customizing Seed Data

To modify the seed data, edit `backend/prisma/seed.js`:

- Change number of doctors/clients
- Modify names, emails, or other data
- Adjust booking dates, statuses, etc.

Then run the seed script again.
