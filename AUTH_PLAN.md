# User Authentication Implementation Plan

## Current State
✅ Users table already has:
- `mobile_number` (unique, used as login identifier)
- `password_hash` (for storing hashed passwords)
- `email` (optional but should be unique for auth)
- `full_name`, `role`, `district_location`, etc.

## What We Need to Add

### 1. Database Changes
- Make `email` UNIQUE (for alternative login)
- Ensure `password_hash` is NOT NULL
- Optional: Add `is_email_verified` field

### 2. Backend Dependencies
Install:
- `bcryptjs` - Password hashing
- `express-session` - Session management
- `cookie-parser` - Parse cookies

### 3. API Endpoints to Create
```
POST   /api/auth/signup          - Register new user
POST   /api/auth/login           - Login user
POST   /api/auth/logout          - Logout & clear session
GET    /api/auth/me              - Get current logged-in user
GET    /api/auth/check           - Check authentication status
```

### 4. Authentication Middleware
- `authenticateUser()` - Check if user is logged in
- Protect /api/posts, /api/marketplace (for future updates)

### 5. Frontend Pages to Create
- `login.html` - Mobile & Email login form
- `signup.html` - Registration form
- Update navbar to show logged-in user

### 6. Session Management
- Store user_id in session
- Set session cookie (httpOnly, secure)
- Clear session on logout

### 7. Frontend Logic Updates
- script.js: Check authentication on page load
- Default to login if not authenticated
- Show login link if not authenticated
- Show user profile link if authenticated
- Update POST /api/posts to use session user_id (not hardcoded)

## Implementation Steps (in order)
1. ✅ Add bcryptjs & express-session to package.json
2. ✅ Update Users schema (make email unique)
3. ✅ Configure session middleware in server.js
4. ✅ Create /api/auth/signup endpoint
5. ✅ Create /api/auth/login endpoint
6. ✅ Create /api/auth/logout endpoint
7. ✅ Create /api/auth/me endpoint
8. ✅ Create login.html page
9. ✅ Create signup.html page
10. ✅ Add login/signup UI logic to script.js
11. ✅ Protect existing endpoints with auth middleware
12. ✅ Test full login/signup/logout flow

## Database Migration
For existing users (hardcoded test users), we need to:
1. Update seed script to hash passwords
2. Re-seed database with hashed passwords
3. Keep mobile_number + password_hash as login method

## Security Considerations
- Passwords hashed with bcrypt (salt rounds: 10)
- Session cookies httpOnly (can't be accessed by JavaScript)
- CSRF protection (if needed later)
- Rate limiting on login/signup (optional, implement later)
- Validate email format on signup
