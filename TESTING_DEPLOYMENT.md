# Testing Your Deployed Backend

Your backend is deployed at: **https://therapy-be.onrender.com**

## Quick Health Check ✅

The health endpoint is working! Test it:

```
https://therapy-be.onrender.com/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2025-11-13T20:17:42.841Z"
}
```

## Testing Methods

### Method 1: Browser Testing (Simple Endpoints)

Open these URLs directly in your browser:

1. **Health Check:**

   ```
   https://therapy-be.onrender.com/api/health
   ```

2. **Get All Doctors** (if public):
   ```
   https://therapy-be.onrender.com/api/doctors
   ```

### Method 2: Using curl (Command Line)

#### Test Health Endpoint:

```bash
curl https://therapy-be.onrender.com/api/health
```

#### Test Registration:

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

#### Test Login:

```bash
curl -X POST https://therapy-be.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

### Method 3: Using Postman or Insomnia

1. **Create a new request**
2. Set method (GET, POST, etc.)
3. Enter URL: `https://therapy-be.onrender.com/api/[endpoint]`
4. Add headers if needed (Content-Type: application/json)
5. Add body for POST requests
6. Send request

### Method 4: Using Browser Developer Tools

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Run JavaScript:

```javascript
// Test Health Endpoint
fetch("https://therapy-be.onrender.com/api/health")
  .then((res) => res.json())
  .then((data) => console.log("Health:", data))
  .catch((err) => console.error("Error:", err));

// Test Registration
fetch("https://therapy-be.onrender.com/api/auth/register", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    password: "test123456",
    role: "CLIENT",
    preferredLanguage: "FRENCH",
  }),
})
  .then((res) => res.json())
  .then((data) => console.log("Register:", data))
  .catch((err) => console.error("Error:", err));
```

## Test Endpoints Checklist

### ✅ Public Endpoints (No Auth Required)

- [ ] `GET /api/health` - Health check
- [ ] `GET /api/doctors` - List all doctors (if public)
- [ ] `POST /api/auth/register` - Register new user
- [ ] `POST /api/auth/login` - Login
- [ ] `POST /api/auth/forgot-password` - Forgot password

### 🔒 Protected Endpoints (Require Auth Token)

First, get a token by logging in, then use it in the Authorization header:

```bash
# 1. Login and save token
TOKEN=$(curl -X POST https://therapy-be.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | jq -r '.data.token')

# 2. Use token in subsequent requests
curl -X GET https://therapy-be.onrender.com/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

Protected endpoints to test:

- [ ] `GET /api/auth/me` - Get current user
- [ ] `GET /api/users/profile` - Get user profile
- [ ] `GET /api/doctors` - List doctors (if protected)
- [ ] `GET /api/bookings/me` - Get user bookings
- [ ] `POST /api/bookings` - Create booking
- [ ] `GET /api/messages/conversations` - Get conversations

## Common Issues & Solutions

### CORS Errors

If you see CORS errors, make sure:

- `FRONTEND_URL` environment variable is set correctly in Render
- Your frontend URL matches exactly (including protocol: `https://`)

### 401 Unauthorized

- Check if you're including the Authorization header
- Verify the token is valid and not expired
- Make sure token format is: `Bearer <token>`

### 404 Not Found

- Verify the endpoint path is correct
- Check if the route exists in your routes files
- Ensure the API prefix `/api` is included

### 500 Internal Server Error

- Check Render logs for detailed error messages
- Verify database connection (`DATABASE_URL` is set)
- Check if Prisma Client was generated correctly

## Testing with Frontend

1. Update your frontend `.env` file:

   ```env
   VITE_API_URL=https://therapy-be.onrender.com/api
   ```

2. Test from your frontend application:
   - Try logging in
   - Create a booking
   - Send a message
   - Upload a file

## Performance Testing

### Check Response Times:

```bash
time curl https://therapy-be.onrender.com/api/health
```

### Test Concurrent Requests:

```bash
# Install Apache Bench (ab) or use a tool like k6
ab -n 100 -c 10 https://therapy-be.onrender.com/api/health
```

## Monitoring

1. **Check Render Logs:**

   - Go to your Render service
   - Click "Logs" tab
   - Monitor real-time logs

2. **Check Database:**

   - Verify connections in Render dashboard
   - Check database metrics

3. **Check Service Status:**
   - Render dashboard shows service health
   - Monitor uptime and response times

## Next Steps

After confirming everything works:

1. ✅ Update frontend to use production API URL
2. ✅ Test all critical user flows
3. ✅ Monitor logs for any errors
4. ✅ Set up error tracking (if needed)
5. ✅ Configure custom domain (optional)

## Quick Test Script

Save this as `test-api.sh`:

```bash
#!/bin/bash

API_URL="https://therapy-be.onrender.com/api"

echo "Testing Health Endpoint..."
curl -s "$API_URL/health" | jq .

echo -e "\nTesting Registration..."
curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test'$(date +%s)'@example.com",
    "password": "test123456",
    "role": "CLIENT",
    "preferredLanguage": "FRENCH"
  }' | jq .

echo -e "\n✅ Testing complete!"
```

Make it executable and run:

```bash
chmod +x test-api.sh
./test-api.sh
```
