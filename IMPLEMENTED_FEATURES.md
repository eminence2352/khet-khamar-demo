# Implemented Features (Grouped)

This file documents all features that are currently implemented in this project, grouped for easy explanation.

## 1) Project Setup and Runtime

### 1.1 Repository and Environment Setup
- Repository cloned and dependencies installed.
- Environment file support is in place via `.env` and `.env.example`.
- Database setup and seeding scripts are available and wired:
  - `setup-db.js`
  - `seed.js`
  - `seed-news.js`
  - `seed-marketplace.js`

### 1.2 Server Runtime
- Express server with JSON/form parsing, static file hosting, sessions, cookie parser, and CORS.
- Multer configured for post image uploads.
- Upload destination: `public/uploads`.

## 2) Database and Data Model

### 2.1 Core Tables
- `users`
- `posts`
- `comments`
- `post_likes`
- `marketplace_ads`
- `reviews`
- `agricultural_news`

### 2.2 Social/Relationship Tables
- `connection_requests`
- `connections`
- `follows`

### 2.3 Schema Improvements Implemented
- Consistent naming in lower snake_case.
- Foreign keys and integrity constraints for relationships.
- Indexes added for common query paths.
- Post model extended to support news shares:
  - `post_type`
  - `shared_news_title`
  - `shared_news_excerpt`
  - `shared_news_url`
  - `shared_news_source`
  - `shared_news_category`

### 2.4 Diagram Documentation
- Database class diagram maintained in:
  - `database-class-diagram.mmd`

## 3) Authentication and Session Features

### 3.1 Auth Flows
- Signup endpoint with password hashing.
- Login endpoint with password verification.
- Logout endpoint.
- Current user endpoint and auth-check endpoint.

### 3.2 Session-based Protection
- Protected endpoints use session auth middleware (`requireAuth`).
- Auth state consumed by frontend to switch between guest and logged-in UI.

## 4) Feed and Posting Features

### 4.1 Feed Retrieval
- `GET /api/posts` supports:
  - Full feed retrieval.
  - Optional filtering by user (`?userId=...`).
  - Interaction metadata in response:
    - `likesCount`
    - `commentsCount`
    - `likedByCurrentUser` (when logged in)

### 4.2 Create Post
- `POST /api/posts` supports:
  - Text-only post.
  - Image-only post.
  - Text + image post.

### 4.3 News Share to Feed
- `POST /api/news/share` creates a feed post of `post_type = news_share`.
- Shared news is rendered as a special card in feed.

### 4.4 Composer UX (Home)
- Standard file picker support for images.
- Image preview before submit.
- Remove selected image before submit.
- Plus button behavior (home):
  - Scroll to composer.
  - Submit if content exists.
  - Focus composer if empty.

### 4.5 Drag and Drop Upload (Home)
- Drag-and-drop image upload in post composer.
- Drop-zone active visual state while dragging.
- Dropped image enters same preview/remove flow as picked image.

### 4.6 Deep-link to Specific Post
- Feed supports post-focused URL: `index.html?postId=<id>`.
- Target post auto-scroll and temporary highlight.

## 5) Post Interaction Features

### 5.1 Likes
- Toggle like endpoint:
  - `POST /api/posts/:postId/like`
- Persists in `post_likes`.
- Keeps `posts.likes_count` synchronized.

### 5.2 Comments
- Add comment endpoint:
  - `POST /api/posts/:postId/comments`
- Persists in `comments`.

### 5.3 Interaction UI
- Feed like button state reflects whether current user liked the post.
- Comment action supports adding a comment.
- Like/comment counts displayed in feed action labels.

## 6) Profile and Social Networking

### 6.1 Profile Page
- Dedicated profile page added:
  - `public/profile.html`
- Supports viewing own profile and other users' profiles.

### 6.2 Profile Data API
- `GET /api/profiles/:userId` returns:
  - User identity and role fields.
  - Counters (posts, connections, followers, following).
  - Relationship state for current viewer.

### 6.3 Connect Request Flow
- Send request:
  - `POST /api/connections/request`
- List requests:
  - `GET /api/connections/requests`
- Accept/discard request:
  - `POST /api/connections/requests/:requestId/respond`
- List established connections:
  - `GET /api/connections`

### 6.4 Expert Follow Flow
- Follow/unfollow endpoint:
  - `POST /api/follows/:expertId`
- Rule implemented: follow is available only between users with role `Verified Expert`.

### 6.5 Profile Navigation from Feed/Marketplace
- Clicking avatar/name in feed opens that user's profile.
- Clicking seller name in marketplace opens seller profile.

## 7) Profile Settings and Activity

### 7.1 Settings Panel
- Settings section added on own profile.
- Change password form added in UI.

### 7.2 Change Password API
- Endpoint:
  - `POST /api/settings/change-password`
- Validates current password, hashes and stores new password.

### 7.3 Personal Activity API
- Endpoint:
  - `GET /api/me/activity`
- Returns grouped activity:
  - Liked posts.
  - Commented posts.

### 7.4 Activity UI with Direct Navigation
- Profile shows:
  - Posts You Liked.
  - Posts You Commented On.
- Clicking any item navigates directly to that post in feed using post deep-link.

## 8) Marketplace and News Features

### 8.1 Marketplace
- `GET /api/marketplace` with joined seller information.
- Frontend filters by search/category/location.

### 8.2 News
- `GET /api/news` supports external fetch with fallback to local DB news.
- News page includes Share to Feed action per news card.

### 8.3 Weather
- `GET /api/weather` implemented with forecast and fallback behavior.

## 9) Frontend Navigation and UI Behavior

### 9.1 Bottom Nav Updates
- Plus button on all pages routes to compose mode:
  - `index.html?compose=1`
- Profile nav points to `profile.html`.

### 9.2 Guest Mode Handling
- Guest users can browse.
- Protected actions (posting/interactions) redirect to login when needed.

## 10) Files Added/Significantly Updated

### 10.1 Added
- `public/profile.html`
- `IMPLEMENTED_FEATURES.md`

### 10.2 Updated (Major)
- `schema.sql`
- `database-class-diagram.mmd`
- `server.js`
- `public/script.js`
- `public/style.css`
- `public/index.html`
- `public/news.html`
- `public/marketplace.html`
- `seed.js`
- `seed-marketplace.js`
- `seed-news.js`
- `setup-db.js`

## 11) Current Scope Notes

- Translation toggle has been removed; app is currently English-only.
- Post interaction list in profile currently focuses on liked/commented post references and deep-linking.
- Additional UX enhancements (tabs, richer comments UI, notifications) can be added incrementally.
