# How to Run Database Migrations on Render (Free Tier)

## Quick Fix for "Table does not exist" Error

If you're seeing errors like:

```
The table `public.User` does not exist in the current database.
```

You need to run Prisma migrations on your production database.

⚠️ **Note**: Render's free tier doesn't support Shell access, so we'll run migrations from your local machine.

## Method 1: From Your Local Machine (Recommended for Free Tier) ⭐

This is the easiest method when Shell is not available.

1. **Get Database URL from Render**

   - Go to your Render dashboard
   - Click on your **PostgreSQL database** service
   - Go to **"Info"** tab
   - Copy the **"Internal Database URL"** (preferred) or **"External Database URL"**
   - It looks like: `postgresql://user:password@host:port/database`

2. **Navigate to Backend Directory**

   ```bash
   cd backend
   ```

3. **Set Database URL Temporarily**

   **On Windows (PowerShell):**

   ```powershell
   $env:DATABASE_URL="postgresql://user:password@host:port/database"
   ```

   **On Windows (CMD):**

   ```cmd
   set DATABASE_URL=postgresql://user:password@host:port/database
   ```

   **On Mac/Linux:**

   ```bash
   export DATABASE_URL="postgresql://user:password@host:port/database"
   ```

4. **Run Migrations**

   ```bash
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

5. **Wait for Completion**

   - You should see output like:
     ```
     Applying migration `20251111222123_init`
     ...
     All migrations have been successfully applied.
     ```

6. **Verify**
   - Test your API again
   - The registration endpoint should now work

## Method 2: Create a Migration Script (Alternative)

You can create a one-time migration script that runs during deployment:

1. **Create a migration script** (`backend/scripts/migrate.js`):

   ```javascript
   import { execSync } from "child_process";

   console.log("Running database migrations...");
   try {
     execSync("npx prisma migrate deploy --schema=./prisma/schema.prisma", {
       stdio: "inherit",
     });
     console.log("Migrations completed successfully!");
   } catch (error) {
     console.error("Migration failed:", error);
     process.exit(1);
   }
   ```

2. **Add to package.json**:

   ```json
   "scripts": {
     "migrate:deploy": "node scripts/migrate.js"
   }
   ```

3. **Run manually after first deploy** (not recommended for auto-deploy)

## Method 3: Add to Build Process (Not Recommended)

You can add migrations to run automatically after build, but this is not recommended for production as it can cause issues if migrations fail.

If you want to try this, add to `package.json`:

```json
"postinstall": "prisma generate --schema=./prisma/schema.prisma && npx prisma migrate deploy --schema=./prisma/schema.prisma"
```

⚠️ **Warning**: This runs migrations on every deploy, which can be risky.

## Troubleshooting

### "Cannot find module 'prisma'"

- Make sure Prisma is in `dependencies` (not `devDependencies`)
- Run `npm install` first

### "Schema not found"

- Make sure you're in the `backend` directory
- Use `--schema=./prisma/schema.prisma` flag

### "Database connection failed"

- Verify `DATABASE_URL` is set correctly in Render
- Check if database is running and accessible
- Ensure database is in the same region as your service

### "Migration already applied"

- This is normal if migrations were already run
- Check if tables exist: `npx prisma studio` (if accessible)

## Verify Migrations Worked

After running migrations, test your API:

```bash
curl -X POST https://therapy-be.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "test123456",
    "role": "CLIENT",
    "preferredLanguage": "FRENCH"
  }'
```

You should get a success response instead of the "table does not exist" error.

## Next Steps

After migrations are complete:

1. ✅ Test registration endpoint
2. ✅ Test login endpoint
3. ✅ Test other API endpoints
4. ✅ Update frontend to use production API
5. ✅ Test full application flow
