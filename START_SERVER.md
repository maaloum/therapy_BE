# How to Start the Backend Server

## Quick Start

1. **Navigate to the backend directory:**

   ```bash
   cd backend
   ```

2. **Install dependencies (if not already installed):**

   ```bash
   npm install
   ```

3. **Start the server:**

   For development (with auto-reload):

   ```bash
   npm run dev
   ```

   For production:

   ```bash
   npm start
   ```

4. **Verify the server is running:**
   - You should see: `Server running on port 5000`
   - Visit: http://localhost:5000/api/health
   - Should return: `{"status":"ok","timestamp":"..."}`

## Environment Variables

Make sure you have a `.env` file in the backend directory with:

- `PORT=5000` (or your preferred port)
- `JWT_SECRET=your-secret-key`
- `DATABASE_URL=your-database-url`
- `FRONTEND_URL=http://localhost:5173` (or your frontend URL)

## Troubleshooting

### Port Already in Use

If port 5000 is already in use:

- Change the `PORT` in your `.env` file
- Update `VITE_API_URL` in your frontend `.env` file to match

### Database Connection Issues

- Make sure your database is running
- Run `npx prisma migrate dev` to set up the database
- Run `npx prisma generate` to generate Prisma client

### Module Not Found Errors

- Run `npm install` to install all dependencies
- Make sure you're using Node.js version 18 or higher
