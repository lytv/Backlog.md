# M01: API Specifications

## Overview
This document defines the API endpoints for Milestone 1: Foundation and Authentication. All endpoints follow RESTful conventions and return JSON responses.

## Base Configuration
- **Base URL**: `/api/v1`
- **Authentication**: Bearer token via Clerk
- **Content-Type**: `application/json`
- **Rate Limiting**: 100 requests per minute per user

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { },
  "meta": {
    "timestamp": "2024-01-20T10:30:00Z",
    "version": "1.0"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { }
  },
  "meta": {
    "timestamp": "2024-01-20T10:30:00Z",
    "version": "1.0"
  }
}
```

## Authentication Endpoints

### 1. Clerk Webhook Handler
Handles user sync from Clerk to local database.

**Endpoint**: `POST /api/auth/webhook`

**Headers**:
```
svix-id: <webhook_id>
svix-timestamp: <timestamp>
svix-signature: <signature>
```

**Request Body**:
```json
{
  "type": "user.created",
  "data": {
    "id": "clerk_user_id",
    "email_addresses": [{ "email_address": "user@example.com" }],
    "first_name": "John",
    "last_name": "Doe",
    "username": "johndoe"
  }
}
```

**Supported Event Types**:
- `user.created` - New user registration
- `user.updated` - User profile changes
- `user.deleted` - User account deletion

**Response**: `200 OK`

### 2. Get Current User
Returns authenticated user information.

**Endpoint**: `GET /api/auth/me`

**Headers**:
```
Authorization: Bearer <clerk_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "clerkId": "clerk_123",
    "email": "user@example.com",
    "username": "johndoe",
    "fullName": "John Doe",
    "role": "admin",
    "isActive": true,
    "lastLoginAt": "2024-01-20T10:30:00Z",
    "permissions": ["users.view", "users.create"]
  }
}
```

## User Management Endpoints

### 3. List Users
Get paginated list of users (Admin only).

**Endpoint**: `GET /api/users`

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `search` (search by name, email, username)
- `role` (filter by role)
- `isActive` (filter by status)
- `sortBy` (default: createdAt)
- `sortOrder` (asc | desc)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "user@example.com",
      "username": "johndoe",
      "fullName": "John Doe",
      "role": "admin",
      "isActive": true,
      "lastLoginAt": "2024-01-20T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 4. Get User by ID
Get single user details.

**Endpoint**: `GET /api/users/:id`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "clerkId": "clerk_123",
    "email": "user@example.com",
    "username": "johndoe",
    "fullName": "John Doe",
    "phone": "+84901234567",
    "role": "admin",
    "isActive": true,
    "lastLoginAt": "2024-01-20T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-20T00:00:00Z",
    "createdBy": {
      "id": 1,
      "fullName": "System Admin"
    }
  }
}
```

### 5. Create User
Create new user (Admin only).

**Endpoint**: `POST /api/users`

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "fullName": "New User",
  "phone": "+84901234567",
  "role": "worker",
  "sendInvite": true
}
```

**Validation Rules**:
- Email: Required, valid email format, unique
- Username: Required, 3-50 chars, alphanumeric + underscore, unique
- FullName: Required, 2-255 chars
- Phone: Optional, valid phone format
- Role: Required, must be admin|manager|worker

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 2,
    "email": "newuser@example.com",
    "username": "newuser",
    "inviteSent": true
  }
}
```

### 6. Update User
Update user information.

**Endpoint**: `PUT /api/users/:id`

**Request Body**:
```json
{
  "fullName": "Updated Name",
  "phone": "+84901234567",
  "role": "manager",
  "isActive": true
}
```

**Business Rules**:
- Users cannot change their own role
- Only admins can change roles
- Email and username cannot be changed via API

**Response**: `200 OK`

### 7. Deactivate User
Soft delete user (Admin only).

**Endpoint**: `DELETE /api/users/:id`

**Business Rules**:
- Cannot delete self
- Cannot delete last admin
- Deactivates user in both Clerk and local DB

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "User deactivated successfully"
  }
}
```

## Activity Logging Endpoints

### 8. Get Audit Logs
View system audit logs (Admin only).

**Endpoint**: `GET /api/audit-logs`

**Query Parameters**:
- `userId` (filter by user)
- `entityType` (filter by entity)
- `entityId` (filter by specific entity)
- `action` (filter by action type)
- `startDate` (ISO date)
- `endDate` (ISO date)
- `page` (default: 1)
- `limit` (default: 50)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "fullName": "John Doe"
      },
      "action": "UPDATE",
      "entityType": "user",
      "entityId": 2,
      "changes": {
        "role": {
          "old": "worker",
          "new": "manager"
        }
      },
      "ipAddress": "192.168.1.1",
      "createdAt": "2024-01-20T10:30:00Z"
    }
  ]
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Request validation failed |
| DUPLICATE_ENTRY | 409 | Unique constraint violation |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

## Security Headers
All API responses include:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

## Rate Limiting Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1642680000
```

## CORS Configuration
- Allowed Origins: Configured via environment
- Allowed Methods: GET, POST, PUT, DELETE
- Allowed Headers: Authorization, Content-Type
- Credentials: true

## Versioning Strategy
- Version in URL path: `/api/v1/`
- Breaking changes require new version
- Deprecation notices via headers
- Minimum 6 months support for old versions
