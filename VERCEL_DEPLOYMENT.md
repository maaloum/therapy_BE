# Vercel Deployment Guide

This guide will help you deploy the backend API to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. A PostgreSQL database (recommended: [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Supabase](https://supabase.com), or [Neon](https://neon.tech))
3. Vercel CLI installed (optional, for CLI deployment)

## Important Notes

⚠️ **Socket.io Limitations**: Socket.io requires persistent connections which don't work with Vercel's serverless functions. Real-time messaging features will not work on Vercel. Consider:

- Using a separate service for Socket.io (e.g., Railway, Render, or a dedicated server)
- Implementing polling as a fallback
- Using Vercel's Edge Functions with alternative real-time solutions

⚠️ **File Uploads**: The `/tmp` directory on Vercel is ephemeral. For production file uploads, use:

- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)
- AWS S3
- Cloudinary
- Other cloud storage solutions

## Step 1: Prepare Your Database

1. Set up a PostgreSQL database
2. Run migrations locally or use Prisma Migrate:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

## Step 2: Environment Variables

You'll need to set these environment variables in Vercel:

### Required Variables:

- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens (use a strong random string)
- `FRONTEND_URL` - Your frontend URL (e.g., `https://your-frontend.vercel.app`)

### Optional Variables:

- `NODE_ENV=production`
- `EMAIL_HOST` - SMTP server for emails
- `EMAIL_PORT` - SMTP port
- `EMAIL_USER` - SMTP username
- `EMAIL_PASS` - SMTP password
- `STRIPE_SECRET_KEY` - If using Stripe payments
- `TWILIO_ACCOUNT_SID` - If using Twilio
- `TWILIO_AUTH_TOKEN` - If using Twilio

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your Git repository (GitHub, GitLab, or Bitbucket)
4. Configure the project:
   - **Root Directory**: `backend`
   - **Framework Preset**: Other
   - **Build Command**: `npm run build` (or leave empty, Prisma will generate in postinstall)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`
5. Add all environment variables from Step 2
6. Click "Deploy"

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:

   ```bash
   npm i -g vercel
   ```

2. Navigate to the backend directory:

   ```bash
   cd backend
   ```

3. Login to Vercel:

   ```bash
   vercel login
   ```

4. Deploy:

   ```bash
   vercel
   ```

5. For production deployment:

   ```bash
   vercel --prod
   ```

6. Set environment variables:
   ```bash
   vercel env add DATABASE_URL
   vercel env add JWT_SECRET
   vercel env add FRONTEND_URL
   # Add other variables as needed
   ```

## Step 4: Update Frontend

Update your frontend's `.env` file to point to the Vercel backend URL:

```env
VITE_API_URL=https://your-backend.vercel.app/api
```

## Step 5: Run Database Migrations

After deployment, run migrations on your production database:

```bash
# Set DATABASE_URL to production database
export DATABASE_URL="your-production-database-url"

# Run migrations
cd backend
npx prisma migrate deploy
```

Or use Vercel's environment variables:

```bash
vercel env pull .env.production
npx prisma migrate deploy
```

## Step 6: Verify Deployment

1. Check the health endpoint:

   ```
   https://your-backend.vercel.app/api/health
   ```

2. Test API endpoints to ensure everything works

## Troubleshooting

### Build Errors

- **Prisma Client not generated**: Make sure `postinstall` script runs `prisma generate`
- **Module not found**: Ensure all dependencies are in `dependencies` not `devDependencies`

### Runtime Errors

- **Database connection**: Verify `DATABASE_URL` is set correctly
- **CORS errors**: Update `FRONTEND_URL` environment variable
- **File upload errors**: Configure cloud storage (see Important Notes above)

### Function Timeout

Vercel has execution time limits:

- Hobby: 10 seconds
- Pro: 60 seconds
- Enterprise: 300 seconds

Optimize long-running operations or use background jobs.

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
