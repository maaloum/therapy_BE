# How to Add Build Command in Render

## Method 1: Through Render Dashboard (Recommended)

### Step-by-Step Instructions:

1. **Log in to Render Dashboard**
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Sign in to your account

2. **Navigate to Your Service**
   - Click on your web service (e.g., `therapy-platform-backend`)

3. **Go to Settings**
   - Click on the **"Settings"** tab in the top navigation

4. **Find Build & Deploy Section**
   - Scroll down to the **"Build & Deploy"** section

5. **Update Build Command**
   - Find the **"Build Command"** field
   - Replace or enter:
     ```
     npm install && npx prisma generate --schema=./prisma/schema.prisma
     ```

6. **Save Changes**
   - Click **"Save Changes"** button at the bottom

7. **Deploy**
   - Click **"Manual Deploy"** → **"Deploy latest commit"** to trigger a new build
   - Or wait for the next automatic deployment

## Method 2: Using render.yaml (For New Services)

If you're creating a new service, you can use the `render.yaml` file:

1. **Ensure render.yaml is in Repository Root**
   - The file should be at: `backend/render.yaml` (if backend is your root)
   - Or move it to repository root if needed

2. **Create Service from Blueprint**
   - In Render dashboard, click **"New +"** → **"Blueprint"**
   - Connect your repository
   - Render will automatically detect and use `render.yaml`

3. **Or Create Service Manually**
   - When creating a new web service, Render will read `render.yaml` if present
   - The build command will be automatically set

## Current Build Command

Your current build command is:
```bash
npm install && npx prisma generate --schema=./prisma/schema.prisma
```

This command:
1. Installs all npm dependencies
2. Generates Prisma Client with the explicit schema path

## Alternative Build Commands

If you need different build steps, here are some alternatives:

### Simple Build (if schema path works automatically):
```bash
npm install && npm run build
```

### With Environment Check:
```bash
npm install && npx prisma generate --schema=./prisma/schema.prisma && npm run build
```

### With Migration (not recommended for build, use separately):
```bash
npm install && npx prisma generate --schema=./prisma/schema.prisma
```

## Troubleshooting

### Build Command Not Saving
- Make sure you're in the Settings tab
- Scroll to the bottom and click "Save Changes"
- Refresh the page and check if it saved

### Build Still Failing
- Check the build logs in the "Logs" tab
- Verify Root Directory is set to `backend`
- Ensure the schema path is correct relative to Root Directory

### Prisma Still Can't Find Schema
- Make sure Root Directory is set to `backend`
- The schema path `./prisma/schema.prisma` is relative to the Root Directory
- Verify the file exists at `backend/prisma/schema.prisma` in your repository

## Quick Reference

**Location in Dashboard:**
```
Service → Settings → Build & Deploy → Build Command
```

**Current Command:**
```
npm install && npx prisma generate --schema=./prisma/schema.prisma
```

**Start Command:**
```
npm start
```

**Root Directory:**
```
backend
```

