# Render Deployment Guide

This guide will help you deploy the backend API to Render.

## Prerequisites

1. A Render account (sign up at [render.com](https://render.com))
2. A PostgreSQL database (Render PostgreSQL recommended)
3. Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Set Up PostgreSQL Database on Render

1. Go to your Render dashboard
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `therapy-platform-db` (or your preferred name)
   - **Database**: `therapy_platform` (or your preferred name)
   - **User**: Auto-generated
   - **Region**: Choose closest to your users
   - **Plan**: Free tier available (upgrades available)
4. Click "Create Database"
5. **Save the Internal Database URL** - you'll need it for the web service

## Step 2: Prepare Your Repository

Make sure your code is pushed to GitHub/GitLab/Bitbucket.

## Step 3: Create Web Service on Render

1. Go to your Render dashboard
2. Click "New +" → "Web Service"
3. Connect your repository
4. Configure the service:

   **Basic Settings:**

   - **Name**: `therapy-platform-backend` (or your preferred name)
   - **Region**: Same as your database
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate --schema=./prisma/schema.prisma`
   - **Start Command**: `npm start`
   - **Plan**: Free tier available (upgrades available)

   **Environment Variables:**
   Add the following environment variables:

   **Required:**

   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render sets this automatically, but good to have)
   - `DATABASE_URL` = Your PostgreSQL connection string from Step 1
   - `JWT_SECRET` = A strong random string (generate with: `openssl rand -base64 32`)
   - `FRONTEND_URL` = Your frontend URL (e.g., `https://your-frontend.onrender.com`)

   **Optional (but recommended):**

   - `EMAIL_HOST` = Your SMTP server
   - `EMAIL_PORT` = SMTP port (usually 587 or 465)
   - `EMAIL_USER` = SMTP username
   - `EMAIL_PASS` = SMTP password
   - `STRIPE_SECRET_KEY` = If using Stripe
   - `TWILIO_ACCOUNT_SID` = If using Twilio
   - `TWILIO_AUTH_TOKEN` = If using Twilio

5. Click "Create Web Service"

## Step 4: Run Database Migrations

After the service is deployed, you need to run Prisma migrations:

### Option A: Using Render Shell

1. Go to your web service on Render
2. Click on "Shell" tab
3. Run:
   ```bash
   npx prisma migrate deploy
   ```

### Option B: Using Local Machine

1. Set your DATABASE_URL to the production database:
   ```bash
   export DATABASE_URL="your-render-database-url"
   ```
2. Run migrations:
   ```bash
   cd backend
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

### Option C: Using Render Script (Recommended)

Add a one-time script in Render:

1. Go to your web service
2. Add a new environment variable:
   - Key: `RUN_MIGRATIONS`
   - Value: `true`
3. Add this to your `package.json` scripts:
   ```json
   "postdeploy": "npx prisma migrate deploy"
   ```
4. Or create a separate script and run it manually after first deployment

## Step 5: Verify Deployment

1. Check the service logs in Render dashboard
2. Test the health endpoint:
   ```
   https://your-service.onrender.com/api/health
   ```
3. Should return: `{"status":"ok","timestamp":"..."}`

## Step 6: Update Frontend

Update your frontend's `.env` file to point to the Render backend:

```env
VITE_API_URL=https://your-service.onrender.com/api
```

## Step 7: Configure Custom Domain (Optional)

1. Go to your web service settings
2. Click "Custom Domains"
3. Add your domain
4. Follow DNS configuration instructions

## Important Notes

### File Uploads

Render's filesystem is persistent, but for production, consider:

- Using cloud storage (AWS S3, Cloudinary, etc.)
- Render's disk storage is limited on free tier
- Files persist across deployments

### Socket.io

✅ **Socket.io works on Render!** Unlike serverless platforms, Render supports persistent connections, so real-time messaging will work.

### Environment Variables

- Use Render's environment variable management
- Never commit `.env` files
- Use different values for production vs development

### Database Backups

- Render automatically backs up PostgreSQL databases
- Free tier: Daily backups
- Paid tiers: More frequent backups

### Scaling

- Free tier: Service spins down after 15 minutes of inactivity
- Paid tiers: Always-on service
- Auto-scaling available on paid plans

## Troubleshooting

### Build Failures

- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Render uses Node 18+ by default)

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check if database is in the same region
- Ensure database is not paused (free tier pauses after inactivity)

### Service Not Starting

- Check start command: `npm start`
- Verify PORT environment variable
- Check application logs

### Socket.io Not Working

- Ensure CORS is configured correctly
- Check `FRONTEND_URL` environment variable
- Verify WebSocket support (Render supports it)

## Monitoring

- View logs in real-time in Render dashboard
- Set up alerts for service failures
- Monitor database usage

## Cost Considerations

**Free Tier:**

- 750 hours/month (enough for one always-on service)
- PostgreSQL: 90 days retention
- Service spins down after inactivity

**Paid Plans:**

- Always-on services
- More resources
- Better performance
- Priority support

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Render PostgreSQL](https://render.com/docs/databases)
- [Prisma with Render](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-render)

## Quick Deploy Checklist

- [ ] PostgreSQL database created
- [ ] Web service created
- [ ] Environment variables set
- [ ] Repository connected
- [ ] Service deployed successfully
- [ ] Database migrations run
- [ ] Health endpoint working
- [ ] Frontend updated with new API URL
- [ ] Socket.io tested (if using real-time features)
