# API Documentation

## Overview

This is a NestJS backend API with MongoDB and JWT-based authentication. The API is frontend-agnostic and provides user management and authentication endpoints.

## Base URL

All endpoints are prefixed with `/api`:
```
http://localhost:3000/api
```

## Environment Variables

Before starting the server, update your `.env` file:

```env
NODE_ENV=development
PORT=3000

# MongoDB - Add your MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/cegid-assistant

# JWT - Update these secrets in production
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
JWT_REFRESH_EXPIRATION=7d

# Bcrypt
BCRYPT_SALT_ROUNDS=10
```

## Authentication Endpoints

### Sign Up
**POST** `/api/auth/signup`

Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "isActive": true,
  "createdAt": "2026-02-07T10:00:00.000Z",
  "updatedAt": "2026-02-07T10:00:00.000Z"
}
```

### Sign In
**POST** `/api/auth/signin`

Login and receive access and refresh tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2026-02-07T10:00:00.000Z",
    "updatedAt": "2026-02-07T10:00:00.000Z"
  }
}
```

### Refresh Token
**POST** `/api/auth/refresh`

Get a new access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Sign Out
**POST** `/api/auth/signout`

Revoke a refresh token (logout from current device).

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "message": "Signed out successfully"
}
```

### Sign Out All
**POST** `/api/auth/signout-all`

Revoke all refresh tokens for the user (logout from all devices).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "message": "Signed out from all devices successfully"
}
```

## Users Endpoints

All user endpoints require authentication (except POST /users).

### Create User
**POST** `/api/users`

Create a new user (public endpoint).

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Get All Users
**GET** `/api/users`

Get all active users (protected).

**Headers:**
```
Authorization: Bearer <access_token>
```

### Get Current User
**GET** `/api/users/me`

Get the currently authenticated user's profile (protected).

**Headers:**
```
Authorization: Bearer <access_token>
```

### Get User by ID
**GET** `/api/users/:id`

Get a specific user by ID (protected).

**Headers:**
```
Authorization: Bearer <access_token>
```

### Update User
**PATCH** `/api/users/:id`

Update user profile (protected, owner only).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "username": "newusername",
  "firstName": "Jane",
  "lastName": "Smith"
}
```

**Note:** Users can only update their own profile. Email and password cannot be updated via this endpoint.

### Delete User
**DELETE** `/api/users/:id`

Soft delete a user (sets isActive to false).

**Headers:**
```
Authorization: Bearer <access_token>
```

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## Username Requirements

- Minimum 3 characters
- Maximum 20 characters
- Can only contain letters, numbers, underscores, and hyphens

## Token Expiration

- **Access Token:** 15 minutes
- **Refresh Token:** 7 days

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

Common status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid credentials or token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate email/username)

## Running the Application

1. Install dependencies:
```bash
npm install
```

2. Update `.env` with your MongoDB URI

3. Start in development mode:
```bash
npm run start:dev
```

4. Build for production:
```bash
npm run build
npm run start:prod
```

## Testing with cURL

### Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Sign In
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

### Get Current User
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <your_access_token>"
```

## WebSocket Real-Time Communication

✅ **WebSocket gateway is now available!**

See `WEBSOCKET_DOCUMENTATION.md` for complete WebSocket documentation including:
- Connection setup with JWT authentication
- Sending/receiving messages
- Private messaging (no broadcasting)
- User-specific message delivery by MongoDB `_id`
- Client and server examples
- REST API endpoints for sending messages to users

**Quick Start:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-access-token' }
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
});

socket.on('notification', (data) => {
  console.log('Received:', data);
});
```

## Next Steps

- Implement email verification
- Add password reset functionality
- Implement role-based access control (RBAC)
- Add rate limiting
- Implement 2FA
- Add message persistence for offline users
- Add typing indicators and read receipts
