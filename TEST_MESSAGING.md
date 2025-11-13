# Testing Messaging Functionality

## Current Status

The messaging system has two components:

1. **REST API endpoints** - For sending/receiving messages via HTTP
2. **Socket.io** - For real-time messaging

## Testing REST API

### 1. Login to get a token:

```bash
curl -X POST https://therapy-be.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapy.com","password":"password123"}'
```

Save the token from the response.

### 2. Get all conversations:

```bash
curl https://therapy-be.onrender.com/api/messages/conversations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Send a message (REST API fallback):

```bash
curl -X POST https://therapy-be.onrender.com/api/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": "USER_ID",
    "content": "Hello, this is a test message",
    "type": "TEXT"
  }'
```

### 4. Get messages for a conversation:

```bash
curl https://therapy-be.onrender.com/api/messages/conversation/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Testing Socket.io (Real-time)

Socket.io requires a WebSocket connection. The frontend needs to:

1. **Connect to Socket.io server:**

   ```javascript
   import { io } from "socket.io-client";

   const socket = io("https://therapy-be.onrender.com", {
     auth: {
       token: "YOUR_JWT_TOKEN",
     },
     transports: ["websocket", "polling"],
   });
   ```

2. **Listen for connection:**

   ```javascript
   socket.on("connect", () => {
     console.log("Connected to server");
   });

   socket.on("connect_error", (error) => {
     console.error("Connection error:", error);
   });
   ```

3. **Send a message:**

   ```javascript
   socket.emit("send-message", {
     receiverId: "USER_ID",
     content: "Hello!",
     type: "TEXT",
   });
   ```

4. **Listen for new messages:**
   ```javascript
   socket.on("new-message", (message) => {
     console.log("New message received:", message);
   });
   ```

## Common Issues

### Issue 1: Socket.io Connection Fails

**Symptoms:**

- `connect_error` event fires
- "Authentication error" in console

**Possible Causes:**

1. **CORS Configuration**: The `FRONTEND_URL` environment variable might not match your frontend URL
2. **Token not passed correctly**: Token must be in `auth.token` or `Authorization` header
3. **JWT_SECRET mismatch**: Token verification fails

**Solution:**

- Check `FRONTEND_URL` in Render environment variables
- Ensure token is passed correctly in socket connection
- Verify JWT_SECRET is set correctly

### Issue 2: Messages Not Received in Real-time

**Symptoms:**

- Messages saved to database but not received in real-time
- REST API works but Socket.io doesn't

**Possible Causes:**

1. **Receiver not connected**: The receiver must be connected to Socket.io
2. **Room not joined**: User must be in their personal room (`user:USER_ID`)
3. **CORS blocking**: Browser blocking WebSocket connections

**Solution:**

- Ensure both sender and receiver are connected to Socket.io
- Check browser console for WebSocket errors
- Verify CORS settings allow WebSocket connections

### Issue 3: No Conversations Showing

**Symptoms:**

- Empty conversations list
- Messages exist in database but not showing

**Possible Causes:**

1. **No messages sent yet**: Need to send messages first
2. **User role mismatch**: Conversations logic differs for DOCTOR vs CLIENT
3. **Booking status**: For doctors, only CONFIRMED bookings show conversations

**Solution:**

- Send a test message between two users
- Check user roles match expected behavior
- Verify bookings have CONFIRMED status

## Testing with PowerShell

### Get a user ID to message:

```powershell
# Login as admin
$loginBody = @{
    email = "admin@therapy.com"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "https://therapy-be.onrender.com/api/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $loginBody

$token = $loginResponse.data.token

# Get a doctor ID (first doctor)
$doctors = Invoke-RestMethod -Uri "https://therapy-be.onrender.com/api/doctors?limit=1" -Method Get
$doctorId = $doctors.data.doctors[0].id

# Send a message to the doctor
$messageBody = @{
    receiverId = $doctorId
    content = "Hello, this is a test message from admin"
    type = "TEXT"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://therapy-be.onrender.com/api/messages" `
    -Method Post `
    -Headers @{Authorization = "Bearer $token"} `
    -ContentType "application/json" `
    -Body $messageBody
```

## Frontend Integration Checklist

- [ ] Socket.io client installed (`socket.io-client`)
- [ ] Socket connection established with authentication
- [ ] Token passed in `auth.token` or `Authorization` header
- [ ] `FRONTEND_URL` matches your frontend URL in Render
- [ ] WebSocket connections not blocked by firewall/proxy
- [ ] Error handling for connection failures
- [ ] Reconnection logic implemented

## Debugging Tips

1. **Check Render logs** for Socket.io connection errors
2. **Check browser console** for WebSocket connection issues
3. **Test REST API first** to verify backend is working
4. **Use Socket.io debug mode**: `localStorage.debug = 'socket.io-client:*'`
5. **Verify environment variables** in Render dashboard
