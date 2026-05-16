# Khet-Khamar Feature-to-File Mapping Guide

**Purpose**: Quick reference to locate where each feature is implemented in frontend (HTML/JS) and backend (routes/database).

---

## TABLE OF CONTENTS
1. [Feed Page (index.html)](#feed-page-indexhtml)
2. [News & Weather (news.html)](#news--weather-newshtml)
3. [Marketplace (marketplace.html)](#marketplace-marketplacehtml)
4. [Profile (profile.html)](#profile-profilehtml)
5. [Settings Pages](#settings-pages)

---

## FEED PAGE (index.html)

### Feature: POST CREATION
**Description**: Users create and publish text/image posts to their feed.

| Aspect | Location | Details |
|--------|----------|---------|
| **HTML Elements** | index.html | `#createPostCard`, `#postText`, `#postPhoto`, `.post-btn` (lines ~52-124) |
| **HTML Comment** | index.html | Lines ~49-50: References initFeedPage() in script.js SECTION 3 |
| **JavaScript Handler** | script.js | initFeedPage() at line 778 (SECTION 3) |
| **Post Creation Button** | script.js | `.post-btn` click listener at line 1569 |
| **Form Submission** | script.js | `submitComposerPost()` function at line 1242 |
| **Backend Route** | src/routes/feedRoutes.js | POST /api/posts |
| **Database** | MySQL | posts table (id, userId, textContent, imagePath, isHelpRequest, createdAt) |

**User Flow**:
1. User types text in `#postText` textarea
2. User optionally selects image via `#postPhoto` file input
3. User clicks `.post-btn` button
4. JavaScript calls `submitComposerPost()`
5. Form data sent to POST /api/posts
6. Image uploaded to Cloudinary (if selected)
7. Feed re-rendered with new post at top

---

### Feature: IMAGE UPLOAD FOR POSTS
**Description**: Users can attach images to posts. Images stored in Cloudinary.

| Aspect | Location | Details |
|--------|----------|---------|
| **HTML Elements** | index.html | `#postPhoto` (file input), `#postImagePreview` (img), `#postImagePreviewWrap` (div), `#removePostImage` (button) |
| **HTML Comment** | index.html | Lines ~110-116: References uploadToCloudinary() in script.js |
| **JavaScript Handler** | script.js | `postPhotoInput` change listener at line 1211 |
| **Preview Function** | script.js | `setComposerImageFile()` at line 1169 |
| **Cloudinary Upload** | script.js | `uploadToCloudinary()` function (inline in submitComposerPost) |
| **Backend Route** | src/routes/feedRoutes.js | POST /api/posts accepts FormData with image file |
| **Image Storage** | Cloudinary API | Images stored in cloud (env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) |

**User Flow**:
1. User clicks "Add Photo" label (for `#postPhoto`)
2. File picker opens, user selects image
3. Image preview appears in `#postImagePreview`
4. User can click `#removePostImage` to clear selection
5. On post submit, image uploaded to Cloudinary
6. Cloudinary URL stored in database (imagePath field)
7. Post rendered with image displayed below text

---

### Feature: POST RENDERING (Display Posts in Feed)
**Description**: JavaScript renders post cards with like/comment/delete buttons.

| Aspect | Location | Details |
|--------|----------|---------|
| **HTML Container** | index.html | `.feed-list` (section, line ~129) |
| **HTML Comment** | index.html | Lines ~126-131: Documents all post features rendered |
| **JavaScript Function** | script.js | `renderPosts()` at line 302 (SECTION 2) |
| **Function Comment** | script.js | Detailed explanation of rendered HTML structure |
| **Data Source** | Backend | GET /api/posts returns array of posts |

**What Gets Rendered**:
- Post author avatar, name, role, location
- Post text content
- Post image (if exists)
- Like count, comment count, timestamp
- Buttons: like, comment, share, edit (owner only), delete (owner only)
- Comment panel (hidden by default)

---

### Feature: LIKE POSTS
**Description**: Users click like button to like/unlike posts.

| Aspect | Location | Details |
|--------|----------|---------|
| **HTML Element** | index.html | `.post-like-btn` (rendered dynamically in post cards) |
| **HTML Comment** | index.html | Lines ~127: References LIKE feature |
| **JavaScript Listener** | script.js | Delegated event listener on `.feed-list` at line 1343 |
| **Event Target** | script.js | `.post-like-btn` (detected via event delegation) |
| **Backend Route** | src/routes/feedRoutes.js | POST /api/posts/:id/like |
| **Listener Comment** | script.js | Lines ~1352-1385: Comprehensive comment explaining delegated listener |

**User Flow**:
1. User clicks `.post-like-btn` on a post card
2. Like button highlights/changes color
3. Like count increments
4. POST /api/posts/:postId/like request sent
5. Button state toggles on next refresh

---

### Feature: COMMENT ON POSTS
**Description**: Users view and add comments to posts.

| Aspect | Location | Details |
|--------|----------|---------|
| **HTML Element** | index.html | `.post-comment-btn` (rendered dynamically in post cards) |
| **HTML Comment** | index.html | Lines ~128: References COMMENT feature |
| **JavaScript Listener** | script.js | Delegated event listener on `.feed-list` at line 1343 |
| **Event Target** | script.js | `.post-comment-btn` (detected via event delegation) |
| **Backend Route** | src/routes/feedRoutes.js | POST /api/posts/:id/comments, GET /api/posts/:id/comments |
| **Listener Comment** | script.js | Lines ~1362-1375: Explains comment flow |

**User Flow**:
1. User clicks `.post-comment-btn`
2. Comment panel opens (usually below post)
3. User types comment text
4. User submits comment
5. POST /api/posts/:postId/comments sent
6. Comment panel refreshes to show new comment

---

### Feature: DELETE POSTS (Owner Only)
**Description**: Post authors can delete their own posts via delete button.

| Aspect | Location | Details |
|--------|----------|---------|
| **Delete Button** | index.html | `.js-delete-post` (rendered only for post owner) |
| **Delete Modal** | index.html | `#deleteModal` (lines 134-150) |
| **Modal Title** | index.html | `#deleteModalTitle` |
| **Modal Message** | index.html | `#deleteModalMessage` |
| **Confirm Button** | index.html | `#deleteModalConfirm` |
| **Cancel Button** | index.html | `#deleteModalCancel` |
| **HTML Comment** | index.html | Lines ~130: References DELETE feature and #deleteModal |
| **JavaScript Listener** | script.js | Delegated event listener on `.feed-list` at line 1343 |
| **Event Target** | script.js | `.js-delete-post` button |
| **Modal Handler** | script.js | `openDeleteModal()` function |
| **Backend Route** | src/routes/feedRoutes.js | DELETE /api/posts/:id |
| **Listener Comment** | script.js | Lines ~1376-1380: Explains delete flow |

**User Flow**:
1. User clicks `.js-delete-post` on their own post
2. `#deleteModal` confirmation dialog appears
3. User clicks `#deleteModalConfirm` to confirm
4. DELETE /api/posts/:postId request sent
5. Post removed from feed
6. Feed re-rendered without deleted post

---

### Feature: EDIT POSTS (Owner Only)
**Description**: Post authors can edit their own post text.

| Aspect | Location | Details |
|--------|----------|---------|
| **Edit Button** | index.html | `.js-edit-post` (rendered only for post owner) |
| **Edit Modal** | index.html | `#editModal` (lines 117-130) |
| **Modal Title** | index.html | `#editModalTitle` |
| **Modal Textarea** | index.html | `#editModalText` |
| **Save Button** | index.html | `#editModalSave` |
| **Cancel Button** | index.html | `#editModalCancel` |
| **Close Button** | index.html | `#editModalClose` |
| **HTML Comment** | index.html | Lines ~117: References EDIT feature and #editModal |
| **JavaScript Listener** | script.js | Delegated event listener on `.feed-list` at line 1343 |
| **Event Target** | script.js | `.js-edit-post` button |
| **Modal Handler** | script.js | `openEditModal()` function |
| **Backend Route** | src/routes/feedRoutes.js | PATCH /api/posts/:id |
| **Listener Comment** | script.js | Lines ~1371-1375: Explains edit flow |

**User Flow**:
1. User clicks `.js-edit-post` on their own post
2. `#editModal` appears with current post text in `#editModalText`
3. User edits text in textarea
4. User clicks `#editModalSave`
5. PATCH /api/posts/:postId sent with new text
6. Post updated in feed

---

### Feature: SHARE POST
**Description**: Users can share posts (typically to news feed or copy link).

| Aspect | Location | Details |
|--------|----------|---------|
| **HTML Element** | index.html | `.post-share-btn` (rendered dynamically in post cards) |
| **HTML Comment** | index.html | Lines ~129: References SHARE feature |
| **JavaScript Listener** | script.js | Delegated event listener on `.feed-list` at line 1343 |
| **Menu Button** | index.html | `.js-post-menu-btn` (three-dot menu) |
| **Listener Comment** | script.js | Lines ~1381-1385: Mentions share in menu options |

---

### Feature: MARKETPLACE FEATURED ITEMS (On Feed)
**Description**: Right rail shows featured marketplace items to encourage shopping.

| Aspect | Location | Details |
|--------|----------|---------|
| **HTML Container** | index.html | `#featuredMarketplaceList` (aside rail, line ~51) |
| **JavaScript Function** | script.js | `renderMarketplaceRailItems()` at line ~806 |
| **Data Source** | Backend | GET /api/marketplace (limited to featured items) |

---

### Feature: CONNECTIONS LIST (On Feed)
**Description**: Right rail shows user's connections/followers.

| Aspect | Location | Details |
|--------|----------|---------|
| **HTML Container** | index.html | `#homeConnectionsList` (aside rail, line ~138) |
| **JavaScript Function** | script.js | `renderConnectionsRailItems()` at line ~871 |
| **Data Source** | Backend | GET /api/connections |

---

## NEWS & WEATHER (news.html)

### Feature: WEATHER LOCATION SELECTOR
**Description**: Users click green button to select weather location from dropdown.

| Aspect | Location | Details |
|--------|----------|---------|
| **Trigger Button** | news.html | `#weatherLocationTrigger` (button with "📍 Dhaka ▼" text, line 768) |
| **Dropdown Container** | news.html | `#weatherLocationModal` (dropdown div, line 773) |
| **Location Items** | news.html | `.weather-location-item` (6 buttons in dropdown) |
| **Current Location Display** | news.html | `#currentWeatherArea` (text span, line 772) |
| **CSS Class** | news.html | `.weather-location-selector` (line 129) - position:relative wrapper |
| **CSS Active State** | news.html | `.weather-location-modal.active` (line 104) - shows dropdown |
| **CSS Item Active** | news.html | `.weather-location-item.active` (line 122) - highlights selected |
| **HTML Comment** | news.html | Lines ~511-608: Comprehensive documentation |
| **JavaScript Setup** | news.html | `setupWeatherLocationModal()` function (inline) |
| **JavaScript Render** | news.html | `renderWeatherLocationDropdown()` function (inline) |
| **JavaScript Toggle** | news.html | `openWeatherLocationModal()` / `closeWeatherLocationModal()` functions (inline) |
| **Backend Route** | src/routes/weatherRoutes.js | GET /api/weather?area={location}&days=14 |

**Supported Locations**: Dhaka, Gazipur, Bogura, Rajshahi, Khulna, Chattogram

**User Flow**:
1. User opens news.html
2. Sees green button: "📍 Dhaka ▼"
3. User clicks button
4. `#weatherLocationModal` dropdown opens showing 6 locations
5. User clicks location (e.g., "Gazipur")
6. `#currentWeatherArea` text updates to "Gazipur"
7. Weather card re-renders with new location data
8. GET /api/weather?area=Gazipur&days=14 called

---

### Feature: WEATHER FORECAST DISPLAY
**Description**: Show current weather and 14-day forecast for selected location.

| Aspect | Location | Details |
|--------|----------|---------|
| **HTML Container** | news.html | `#weatherContainer` (div that holds weather cards) |
| **Weather Card** | news.html | `.weather-card` (dynamically generated) |
| **Current Temp** | news.html | `.weather-temp` (e.g., "28°C") |
| **Forecast Grid** | news.html | `.forecast-grid` (14 forecast day cards) |
| **Backend Route** | src/routes/weatherRoutes.js | GET /api/weather?area={location}&days=14 |
| **Data Structure** | weatherRoutes.js | `{ area, current: {temp, condition, humidity, wind, rain}, forecast: [{...}, ...] }` |
| **Fallback Data** | weatherRoutes.js | If API fails: synthetic data (temp: 30°C, condition: "Partly Cloudy") |

**Displayed Info**:
- **Current**: Temperature, Condition, Humidity, Wind Speed, Rainfall
- **14-Day Forecast**: Max/Min temp, Condition, Rainfall, Wind Speed

---

### Feature: AGRICULTURAL NEWS
**Description**: Display news articles relevant to farming.

| Aspect | Location | Details |
|--------|----------|---------|
| **HTML Container** | news.html | `#newsContainer` (div that holds news articles) |
| **News Card** | news.html | `.news-card` (dynamically generated) |
| **Backend Route** | src/routes/newsRoutes.js | GET /api/news |
| **Share to Feed** | src/routes/newsRoutes.js | POST /api/news/share |

---

## MARKETPLACE (marketplace.html)

### Feature: PRODUCT LISTING & BROWSING
**Description**: Display all products available for purchase in grid layout.

| Aspect | Location | Details |
|--------|----------|---------|
| **HTML Container** | marketplace.html | `#marketplaceList` (grid of product cards) |
| **Product Card** | marketplace.html | `.marketplace-card` (dynamically rendered) |
| **Product Image** | marketplace.html | `.marketplace-image` (from Cloudinary) |
| **Product Title** | marketplace.html | `.marketplace-title` |
| **Product Price** | marketplace.html | `.marketplace-price` |
| **Seller Info** | marketplace.html | `.marketplace-seller` |
| **HTML Comment** | marketplace.html | Lines ~19-123: Comprehensive documentation |
| **JavaScript Handler** | script.js | `initMarketplacePage()` at line 1845 (SECTION 4) |
| **Backend Route** | src/routes/marketplaceRoutes.js | GET /api/marketplace |

**User Flow**:
1. User opens marketplace.html
2. Page fetches GET /api/marketplace
3. Products displayed in grid layout
4. User can view product details, price, seller info

---

### Feature: CREATE NEW LISTING
**Description**: Users create and post new products for sale.

| Aspect | Location | Details |
|--------|----------|---------|
| **Form** | marketplace.html | `#marketplaceForm` |
| **Product Name** | marketplace.html | `#marketplaceProductName` (text input) |
| **Price** | marketplace.html | `#marketplacePrice` (number input) |
| **Description** | marketplace.html | `#marketplaceDescription` (textarea) |
| **Photo Upload** | marketplace.html | `#marketplacePhoto` (file input) |
| **Submit Button** | marketplace.html | `.marketplace-create-btn` |
| **JavaScript Handler** | script.js | `initMarketplacePage()` at line 1845 |
| **Backend Route** | src/routes/marketplaceRoutes.js | POST /api/marketplace |
| **Image Upload** | Cloudinary | Via uploadToCloudinary() function in SECTION 3 |

**User Flow**:
1. User fills in product name, price, description
2. User optionally selects product image
3. User clicks create button
4. Image uploaded to Cloudinary
5. POST /api/marketplace sent with product data + Cloudinary URL
6. New product appears in `#marketplaceList`

---

### Feature: EDIT MARKETPLACE LISTING (Owner Only)
**Description**: Product owners can edit their listing details.

| Aspect | Location | Details |
|--------|----------|---------|
| **Edit Button** | marketplace.html | `.marketplace-edit-btn` (only visible to product owner) |
| **Edit Modal** | marketplace.html | `#editMarketplaceModal` |
| **Backend Route** | src/routes/marketplaceRoutes.js | PATCH /api/marketplace/:id |

---

### Feature: DELETE MARKETPLACE LISTING (Owner Only)
**Description**: Product owners can delete their listings.

| Aspect | Location | Details |
|--------|----------|---------|
| **Delete Button** | marketplace.html | `.marketplace-delete-btn` (only visible to product owner) |
| **Confirmation Dialog** | marketplace.html | Delete confirmation modal |
| **Backend Route** | src/routes/marketplaceRoutes.js | DELETE /api/marketplace/:id |

---

### Feature: SEARCH & FILTER (if implemented)
**Description**: Users can search for products and filter by category.

| Aspect | Location | Details |
|--------|----------|---------|
| **Search Box** | marketplace.html | `#marketplaceSearchInput` (if exists) |
| **JavaScript Handler** | script.js | Event listener in `initMarketplacePage()` |

---

## PROFILE (profile.html)

### Feature: USER PROFILE DISPLAY
**Description**: Show user's avatar, name, role, location, bio.

| Aspect | Location | Details |
|--------|----------|---------|
| **Profile Header** | profile.html | `#profileHeader` |
| **User Name** | profile.html | `#profileUserName` |
| **User Role** | profile.html | `#profileUserRole` (e.g., "Farmer", "Supplier") |
| **User Location** | profile.html | `#profileLocation` |
| **User Bio** | profile.html | `#profileBio` |
| **HTML Comment** | profile.html | Lines ~19-105: Comprehensive documentation |
| **JavaScript Handler** | script.js | `initProfilePage()` at line 2440 (SECTION 5) |
| **Backend Route** | src/routes/profileRoutes.js | GET /api/profile/:userId |

**User Flow**:
1. User opens profile.html?userId=5
2. Page fetches GET /api/profile/5
3. User info displayed in profile header

---

### Feature: FOLLOW / UNFOLLOW (Other Users)
**Description**: Users can follow/unfollow other users.

| Aspect | Location | Details |
|--------|----------|---------|
| **Button** | profile.html | `#followBtn` (only visible when viewing other users' profiles) |
| **JavaScript Handler** | script.js | Click listener in `initProfilePage()` (line 2440) |
| **Backend Route** | src/routes/profileRoutes.js | POST /api/profile/:userId/follow |

**User Flow**:
1. User A opens User B's profile (profile.html?userId=B)
2. `#followBtn` visible with "Follow" text
3. User A clicks `#followBtn`
4. POST /api/profile/B/follow sent
5. Button changes to "Unfollow"
6. User B appears in User A's connections

---

### Feature: USER'S POSTS SECTION
**Description**: Display all posts created by the user.

| Aspect | Location | Details |
|--------|----------|---------|
| **Tab** | profile.html | `#profilePostsTab` |
| **Container** | profile.html | `#profilePostsList` |
| **HTML Comment** | profile.html | Lines ~53-62: Documents posts section |
| **JavaScript Handler** | script.js | Tab click handler in `initProfilePage()` |
| **Backend Route** | src/routes/profileRoutes.js | GET /api/profile/:userId/posts |
| **Rendering** | script.js | `renderPosts()` function (SECTION 2) |

---

### Feature: LIKED POSTS SECTION (Own Profile)
**Description**: Show posts that the user has liked (only on own profile).

| Aspect | Location | Details |
|--------|----------|---------|
| **Tab** | profile.html | `#profileLikedPostsTab` |
| **Container** | profile.html | `#profileLikedPostsList` |
| **Visibility** | profile.html | Only shown when viewing own profile |

---

### Feature: COMMENTED POSTS SECTION (Own Profile)
**Description**: Show posts that the user has commented on (only on own profile).

| Aspect | Location | Details |
|--------|----------|---------|
| **Tab** | profile.html | `#profileCommentedPostsTab` |
| **Container** | profile.html | `#profileCommentedPostsList` |
| **Visibility** | profile.html | Only shown when viewing own profile |

---

### Feature: ROLE REQUEST BUTTON (Own Profile)
**Description**: Button to request role change (Farmer → Supplier, etc.).

| Aspect | Location | Details |
|--------|----------|---------|
| **Button** | profile.html | `#roleRequestBtn` (only on own profile) |
| **Destination** | Button | Links to settings-role.html or opens modal |
| **Related Page** | settings-role.html | Full role request form |

---

## SETTINGS PAGES

### Feature: ACCOUNT SETTINGS (settings.html)
**Description**: Hub page linking to password change and role request pages.

| Aspect | Location | Details |
|--------|----------|---------|
| **Page** | settings.html | Account settings hub |
| **Links** | settings.html | Links to settings-password.html and settings-role.html |
| **HTML Comment** | settings.html | Lines ~19-33: Documents page purpose |
| **JavaScript Handler** | script.js | `initSettingsHomePage()` at line 2878 (SECTION 6) |

---

### Feature: CHANGE PASSWORD (settings-password.html)
**Description**: Users change their account password.

| Aspect | Location | Details |
|--------|----------|---------|
| **Current Password** | settings-password.html | `#currentPassword` (password input) |
| **New Password** | settings-password.html | `#newPassword` (password input) |
| **Confirm Password** | settings-password.html | `#confirmPassword` (password input) |
| **Form** | settings-password.html | `#changePasswordForm` |
| **HTML Comment** | settings-password.html | Lines ~19-46: Comprehensive documentation |
| **JavaScript Handler** | script.js | `initChangePasswordPage()` at line 2895 (SECTION 6) |
| **Form Submit** | script.js | Event listener on `#changePasswordForm` at line 2906 |
| **Backend Route** | src/routes/settingsRoutes.js | POST /api/settings/change-password |

**User Flow**:
1. User opens settings-password.html
2. User enters current password (for verification)
3. User enters new password
4. User confirms new password
5. User clicks submit
6. POST /api/settings/change-password sent
7. If successful: "Password changed successfully" message
8. If failed: Error message

---

### Feature: REQUEST ROLE CHANGE (settings-role.html)
**Description**: Users request to change their role (Farmer → Supplier → Expert).

| Aspect | Location | Details |
|--------|----------|---------|
| **Role Select** | settings-role.html | `#desiredRole` (dropdown) |
| **Reason Textarea** | settings-role.html | `#roleRequestReason` (textarea) |
| **Form** | settings-role.html | `#roleRequestForm` |
| **Status Display** | settings-role.html | `#roleRequestStatus` (shows current request status) |
| **HTML Comment** | settings-role.html | Lines ~19-48: Comprehensive documentation |
| **JavaScript Handler** | script.js | `initRoleRequestPage()` at line 2944 (SECTION 6) |
| **Form Submit** | script.js | Event listener on `#roleRequestForm` at line 2984 |
| **Status Fetch** | script.js | `loadRoleRequestStatus()` function |
| **Backend Route** | src/routes/settingsRoutes.js | POST /api/settings/role-request |
| **Status Route** | src/routes/settingsRoutes.js | GET /api/settings/role-request |

**Role Types**:
- **farmer** - Default role, can post and comment
- **general vendor** (Seller) - Can also list products in marketplace
- **verified expert** (Expert) - Can provide expert advice, higher visibility

**User Flow**:
1. User opens settings-role.html
2. Page shows current role request status
3. User selects desired role from `#desiredRole` dropdown
4. User enters reason in `#roleRequestReason`
5. User clicks submit
6. POST /api/settings/role-request sent
7. Request goes to admin for approval
8. Status updated in `#roleRequestStatus`

---

## QUICK REFERENCE: FILE-TO-ROUTE MAPPING

| Frontend File | Backend Route File | Features |
|---------------|-------------------|----------|
| index.html | feedRoutes.js | POST, LIKE, COMMENT, DELETE, EDIT |
| news.html | weatherRoutes.js, newsRoutes.js | WEATHER, NEWS |
| marketplace.html | marketplaceRoutes.js | LISTING CREATE, EDIT, DELETE |
| profile.html | profileRoutes.js | USER INFO, FOLLOW, POSTS |
| settings*.html | settingsRoutes.js | PASSWORD, ROLE REQUEST |
| login.html, signup.html | authRoutes.js | LOGIN, SIGNUP, AUTH |

---

## BACKEND ROUTE FILES & ENDPOINTS

### src/routes/feedRoutes.js
- **POST** `/api/posts` - Create new post (with optional image)
- **GET** `/api/posts` - Fetch feed posts
- **POST** `/api/posts/:id/like` - Toggle like
- **POST** `/api/posts/:id/comments` - Add comment
- **GET** `/api/posts/:id/comments` - Fetch comments
- **DELETE** `/api/posts/:id` - Delete post

### src/routes/weatherRoutes.js
- **GET** `/api/weather?area={location}&days=14` - Get weather forecast

### src/routes/newsRoutes.js
- **GET** `/api/news` - Fetch news articles
- **POST** `/api/news/share` - Share news to personal feed

### src/routes/marketplaceRoutes.js
- **GET** `/api/marketplace` - Fetch all products
- **POST** `/api/marketplace` - Create product listing
- **PATCH** `/api/marketplace/:id` - Edit product listing
- **DELETE** `/api/marketplace/:id` - Delete product listing

### src/routes/profileRoutes.js
- **GET** `/api/profile/:userId` - Fetch user profile
- **GET** `/api/profile/:userId/posts` - Fetch user's posts
- **POST** `/api/profile/:userId/follow` - Toggle follow

### src/routes/settingsRoutes.js
- **POST** `/api/settings/change-password` - Change password
- **POST** `/api/settings/role-request` - Request role change
- **GET** `/api/settings/role-request` - Get role request status

### src/routes/authRoutes.js
- **POST** `/api/auth/signup` - User registration
- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/logout` - User logout
- **GET** `/api/auth/check` - Check if user is logged in
- **GET** `/api/auth/me` - Get current user profile

---

## NOTES FOR DEVELOPERS

1. **Event Delegation**: Most post interactions (like, comment, delete, edit) use delegated event listeners on `.feed-list` for performance, not individual listeners per post.

2. **Cloudinary Integration**: Images are uploaded to Cloudinary, not stored locally. Environment variables required:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

3. **Fallback Data**: If Open-Meteo weather API fails, the backend generates synthetic weather data.

4. **Authentication**: Session-based authentication. Check `/api/auth/check` and `/api/auth/me` for user state.

5. **Cross-Frontend Communication**: When user clicks "Share" on a post, it may navigate to index.html with query parameters (e.g., `?postId=5`).

---

**Last Updated**: May 2026  
**Project**: Khet-Khamar (Farmer Community Platform)
