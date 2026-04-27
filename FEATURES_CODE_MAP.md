# Features Code Map

This file maps each implemented feature to the main backend and frontend code locations.

## 1) Authentication and Session
- Signup and login APIs: `server.js` (`/api/auth/signup`, `/api/auth/login`, `/api/auth/admin-login`)
- Session checks and current user: `server.js` (`/api/auth/check`, `/api/auth/me`, `/api/auth/logout`)
- Middleware guards: `server.js` (`requireAuth`, `requireAdmin`)
- Login/signup UI: `public/login.html`, `public/signup.html`, `public/admin-login.html`
- Client auth helpers: `public/script.js` (`getAuthState`, `getCurrentUserProfile`)

## 2) Feed (Posts, Likes, Comments)
- Feed fetch/create: `server.js` (`/api/posts` GET/POST)
- Like toggle: `server.js` (`/api/posts/:postId/likes`)
- Comments list/create: `server.js` (`/api/posts/:postId/comments` GET/POST)
- Feed rendering and actions: `public/script.js` (`renderPosts`, `initFeedPage`)
- Feed page: `public/index.html`

## 3) News Share to Feed
- Share news into feed post: `server.js` (`/api/news/share`)
- Share button behavior: `public/news.html` (inline script, `.news-share-btn` handler)
- News-style post rendering: `public/script.js` (`renderPosts` branch for `news_share`)

## 4) Profile and Connections
- Profile summary/details: `server.js` (`/api/profiles/:userId`)
- Connection request lifecycle: `server.js` (`/api/connections/request`, `/api/connections/:requestId/respond`)
- Expert follow/unfollow: `server.js` (`/api/follows/:expertId`)
- Profile UI and actions: `public/profile.html`, `public/script.js` (`initProfilePage`, `renderProfileSummary`)

## 5) Settings (Password + Role Request)
- Change password: `server.js` (`/api/settings/change-password`)
- Role request submit/status: `server.js` (`/api/settings/role-request` GET/POST)
- Settings landing page: `public/settings.html`
- Password page UI logic: `public/settings-password.html`, `public/script.js` (`initChangePasswordPage`)
- Role request page UI logic: `public/settings-role.html`, `public/script.js` (`initRoleRequestPage`)

## 6) Role System and Badges
- Role normalization helpers: `server.js` (`desiredRoleToDbRole`, `desiredAdminRoleToDbRole`)
- Expert/seller role badges in feed/profile: `public/script.js` (`formatRoleLabel`, role tag and badge rendering)
- Role badge styling: `public/style.css` (`.expert-share-tag`, `.seller-share-tag`, `.expert-badge`, `.seller-badge`)

## 7) Admin Role Management
- Role request queue for admins: `server.js` (`/api/admin/role-requests`, `/api/admin/role-requests/:requestId/respond`)
- Direct user role update (expert/seller/farmer): `server.js` (`/api/admin/users/:userId/role`)
- Admin role workflows UI: `public/admin.html` (inline script: `loadRoleRequests`, `loadUsers`, `applyRoleUpdate`)

## 8) Admin User Management
- Admin user listing with filters: `server.js` (`/api/admin/users`)
- User search/filter controls and role actions: `public/admin.html` (inline script: `loadUsers`)

## 9) Admin Content Moderation
- Admin post list/delete: `server.js` (`/api/admin/posts`, `/api/admin/posts/:postId` DELETE)
- Admin comment list/delete: `server.js` (`/api/admin/comments`, `/api/admin/comments/:commentId` DELETE)
- Admin moderation UI: `public/admin.html` (inline script: `loadPosts`, `loadComments`)

## 10) Marketplace
- Marketplace ads read: `server.js` (`/api/marketplace`)
- Marketplace ad creation: `server.js` (`/api/marketplace/listings`)
- Marketplace UI: `public/marketplace.html`, `public/script.js` (`initMarketplacePage`)

## 11) Weather (Detailed Forecast UI)
- Weather API integration and fallback: `server.js` (`/api/weather`)
- Weather rendering, theming, and farming outlook: `public/news.html` (inline script: `loadWeather`, `getWeatherThemeClass`, `getWeatherOutlook`)

## 12) Agricultural News
- External + local news aggregation and caching: `server.js` (`/api/news`, `externalNewsCache`)
- News card rendering: `public/news.html` (inline script: `loadNews`)

## 13) Activity Tracking (My Engagement)
- My liked/commented activity: `server.js` (`/api/me/activity`)
- Activity display in profile: `public/script.js` (`renderActivityCards`, `loadActivitySummary`)

## 14) File Uploads (Post Images)
- Upload storage and validation: `server.js` (`multer` setup, `upload` middleware)
- Upload folder setup: `server.js` (`public/uploads` bootstrap)
- Image post rendering: `public/script.js` (`renderPosts` image section)

## 15) UI Shell and Shared Styling
- Shared navigation/layout pages: `public/index.html`, `public/profile.html`, `public/marketplace.html`, `public/news.html`, `public/admin.html`
- Shared styles: `public/style.css`
- Shared client runtime: `public/script.js`

## 16) Seed and Setup Utilities
- DB setup utility: `setup-db.js`
- Seed scripts: `seed.js`, `seed-news.js`, `seed-marketplace.js`
- Schema definition: `schema.sql`
