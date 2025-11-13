# Therapy Booking Platform - Backend

A Node.js/Express backend API for a multilingual therapy booking platform.

## Features

- RESTful API
- JWT Authentication
- Real-time messaging (Socket.io)
- PostgreSQL database with Prisma ORM
- Multilingual support (i18next)
- Payment processing (Stripe)
- File uploads
- Admin panel

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Set up PostgreSQL database and update `DATABASE_URL` in `.env`

4. Run Prisma migrations:
```bash
npm run prisma:migrate
```

5. Generate Prisma client:
```bash
npm run prisma:generate
```

6. Start development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/language` - Update language preference

### Doctors
- `GET /api/doctors` - List all doctors
- `GET /api/doctors/:id` - Get doctor details
- `PUT /api/doctors/profile` - Update doctor profile
- `GET /api/doctors/profile/me` - Get own profile
- `GET /api/doctors/statistics/me` - Get statistics

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/me` - Get user's bookings
- `GET /api/bookings/:id` - Get booking details
- `PATCH /api/bookings/:id/status` - Update booking status
- `PATCH /api/bookings/:id/reschedule` - Reschedule booking

### Messages
- `GET /api/messages/conversations` - Get all conversations
- `GET /api/messages/conversation/:userId` - Get messages
- `POST /api/messages` - Send message
- `PATCH /api/messages/read/:userId` - Mark as read

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/webhook` - Stripe webhook
- `GET /api/payments/history` - Payment history

### Admin
- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/:id/verify` - Verify user
- `GET /api/admin/analytics` - Get analytics
- `GET /api/admin/bookings` - List all bookings

## Database Schema

See `prisma/schema.prisma` for the complete database schema.

## Tech Stack

- Node.js
- Express
- PostgreSQL
- Prisma ORM
- Socket.io
- JWT
- Stripe
- i18next

