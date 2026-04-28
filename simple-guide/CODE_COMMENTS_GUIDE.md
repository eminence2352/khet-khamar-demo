# Code Comments Guide

This guide shows which files now have inline comments to help you understand the codebase.

## Backend Files with Inline Comments

### Server & Configuration

#### server.js
- **What it does**: Application entrypoint and module wiring hub
- **Comments explain**:
  - Environment variable loading (dotenv)
  - What each module import does (app, database, upload, middleware, helpers, routes)
  - How config objects are created
  - Middleware setup (express-session, CORS, etc.)
  - Route registration (what each route file provides)
  - Error handler attachment
  - Server startup on port 3000

#### src/config/app.js
- **What it does**: Express app initialization with middleware
- **Comments explain**:
  - CORS setup (allows cross-domain requests)
  - Cookie and JSON parsing
  - Session management (7-day expiration, httpOnly cookies)
  - Static file serving from public/ folder

#### src/config/database.js
- **What it does**: MySQL connection pool management
- **Comments explain**:
  - Database pool creation with connection limits
  - Connection testing on startup
  - Promise-based interface for async/await support

#### src/config/upload.js
- **What it does**: Multer file upload configuration
- **Comments explain**:
  - Upload directory creation and naming
  - File size limits (5MB max)
  - Allowed image file types
  - Storage configuration

### Middleware

#### src/middleware/auth.js
- **What it does**: Authentication gate functions for protected endpoints
- **Comments explain**:
  - `requireAuth` middleware: Checks if normal user is logged in
  - `requireAdmin` middleware: Checks if user has Admin role in database
  - Session validation and role verification

#### src/middleware/errorHandler.js
- **What it does**: Centralized error handling for the entire app
- **Comments explain**:
  - Multer error handling (file size, type errors)
  - Generic error response format

### Helpers

#### src/helpers/roles.js
- **What it does**: Role conversion and validation utilities
- **Comments explain**:
  - Converting frontend role names to database format
  - Role type checking (isExpertRole, etc.)

#### src/helpers/connections.js
- **What it does**: User connection management helpers
- **Comments explain**:
  - Normalizing connection pairs (ensures consistent ordering)
  - Checking connection status between users

### API Routes with Comments

#### src/routes/authRoutes.js (Fully Commented)
**Endpoints**:
- `POST /api/auth/signup` - User registration
  - Comments explain: Form validation, duplicate checking, password hashing, session creation
  
- `POST /api/auth/login` - User login
  - Comments explain: Mobile number validation, password verification, session creation
  
- `POST /api/auth/logout` - End session
- `POST /api/admin/login` - Admin login with role verification
- `GET /api/auth/me` - Get current user profile
- `GET /api/auth/check` - Check authentication status

#### src/routes/feedRoutes.js (Fully Commented)
**Endpoints**:
- `GET /api/posts` - Fetch feed posts with like counts and comment counts
  - Comments explain: Query structure, like count calculation, comment count retrieval
  
- `POST /api/posts` - Create new post with optional image
  - Comments explain: Image upload handling, validation, database insertion
  
- `POST /api/posts/:postId/like` - Toggle like on a post
  - Comments explain: Database transactions, consistency checking
  
- `POST /api/posts/:postId/comments` - Add comment to post
  - Comments explain: Validation, database insertion, comment threading

#### src/routes/profileRoutes.js (Partially Commented)
- `GET /api/profiles/:userId` - Fetch user profile with stats
  - Fetches post count, connections count, followers, following counts

#### src/routes/settingsRoutes.js (Partially Commented)
- `POST /api/settings/change-password` - Secure password change
  - Comments explain: Password hash verification, bcryptjs usage, security
  
- `GET /api/settings/role-request` - Get user's pending role request

#### src/routes/adminRoutes.js (Partially Commented)
- `GET /api/admin/role-requests` - Admin view all role change requests
  - Comments explain: Sorting by pending status, user data inclusion
  
- `POST /api/admin/role-requests/:requestId/respond` - Accept/reject role requests
  - Comments explain: Transaction usage for consistency

## Frontend Files with Comments

### public/script.js (Partially Commented)
**Functions Explained**:
- **Language & UI Section**: Translation dictionary and language application
- **Auth State Section**:
  - `showNotice(message, type)` - Custom notification system replacing browser alerts
    - Comments explain: DOM creation, CSS animation, auto-dismiss timing
  
  - `getAuthState(forceRefresh)` - Fetch authentication status from server
    - Comments explain: Caching mechanism, /api/auth/check endpoint
  
  - `getCurrentUserProfile(forceRefresh)` - Fetch current user's full profile
    - Comments explain: Authenticated-only endpoint, caching logic

- **Utility Functions**:
  - `escapeHtml(value)` - Prevent HTML injection attacks
  - `getAvatarInitials(name)` - Generate 2-letter initials from user name
  - `formatRelativeTime(dateValue)` - Convert timestamps to "5 minutes ago" format
  - `profileUrlForUser(userId)` - Generate profile page URLs
  - `feedPostUrl(postId)` - Generate feed post URLs
  - `formatRoleLabel(role)` - Convert database roles to display labels
  - `renderPosts(posts, container)` - Generate HTML for feed display

## How to Use This Guide

1. **Start with server.js** - Understand the overall application structure
2. **Then read config files** - Understand how the app is initialized
3. **Read middleware files** - Understand security and error handling
4. **Read routes files** - Understand each feature's backend logic
5. **Read script.js** - Understand frontend interaction logic

## Understanding the Code Flow

### Example: Creating a Post

1. **Frontend** (index.html) - User fills form and clicks "Post"
2. **Frontend** (script.js) - Form validation and fetch to `/api/posts`
3. **Backend** (server.js) - Route registered from feedRoutes.js
4. **Backend** (feedRoutes.js) - Endpoint handles POST /api/posts
   - Validates input (requires text or image)
   - Saves to database
   - Returns success response
5. **Frontend** (script.js) - showNotice() displays success message
6. **Frontend** (script.js) - Feed refreshes with new post

## Finding Specific Features

- **Authentication**: See authRoutes.js (signup, login, logout)
- **Posts & Feed**: See feedRoutes.js (create, like, comment on posts)
- **User Profiles**: See profileRoutes.js and profile.html
- **Admin Functions**: See adminRoutes.js (role management)
- **Notifications**: See showNotice() in script.js
- **Sessions**: See src/config/app.js (session configuration)
- **File Uploads**: See src/config/upload.js and feedRoutes.js POST /api/posts

## Key Technical Concepts Explained in Comments

1. **Database Transactions** - Used in like/unlike to ensure consistency
2. **Session Management** - 7-day cookie-based sessions
3. **Password Hashing** - bcryptjs with 10 salt rounds
4. **Role-Based Access Control** - Admin-only and authenticated-only endpoints
5. **File Upload** - Multer configuration with size/type validation
6. **Frontend Notification System** - Custom showNotice() with auto-dismiss
7. **Relative Time Formatting** - "5 minutes ago" style timestamps
