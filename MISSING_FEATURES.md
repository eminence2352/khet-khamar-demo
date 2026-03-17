# Khet-Khamar Missing Features & Gaps

## Current Implementation Status ✅
- Social feed (posts with images)
- Marketplace for classified ads
- Basic structure (header, nav, filters)
- Image upload support
- Multilingual UI (EN/BN)
- Database with Users, Posts, Marketplace_Ads

---

## TIER 1: Authentication & User Management 🔐
**Priority:** CRITICAL (blocks most features)
- [ ] User login/signup system
- [ ] Email verification
- [ ] Password hashing & storage (not hardcoded userID=1)
- [ ] Session management (JWT or session tokens)
- [ ] Password reset/forgot password flow
- [ ] Profile completion on signup (avatar, bio, location)
- [ ] User logout
- [ ] Prevent unauthorized API access

---

## TIER 2: Post Interactions 💬
**Priority:** HIGH (makes feed social)
- [ ] Like/unlike posts with counter display
- [ ] Comments on posts
- [ ] Comment counts display on posts
- [ ] Delete own posts
- [ ] Edit own posts
- [ ] Delete own comments
- [ ] Edit own comments
- [ ] Reply to comments (nested threads)
- [ ] Sort comments (newest first, most liked)

---

## TIER 3: User Profiles & Discovery 👤
**Priority:** HIGH (builds community)
- [ ] Public user profile pages
- [ ] Profile information (name, avatar, bio, location, verified badge)
- [ ] All posts by specific user
- [ ] User stats (followers, following, post count)
- [ ] Follow/unfollow users
- [ ] Followers/following lists
- [ ] Search/find users
- [ ] Suggested users to follow
- [ ] User privacy settings (public/private profile)
- [ ] Block/report users

---

## TIER 4: Marketplace Seller Features 🛍️
**Priority:** MEDIUM (essential for commerce)
- [ ] Create new marketplace listings (UI form)
- [ ] Edit own listings
- [ ] Delete own listings
- [ ] Seller profile/shop page
- [ ] Seller ratings & reviews
- [ ] Star rating system (1-5 stars)
- [ ] Review history for sellers
- [ ] Seller verification badge
- [ ] Seller dashboard/analytics (views, inquiries, sales)
- [ ] Contact seller button with inquiry tracking
- [ ] Favorites for buyers (save listings)
- [ ] Order/inquiry history

---

## TIER 5: Notifications 🔔
**Priority:** MEDIUM (UX enhancement)
- [ ] Notifications table in database
- [ ] Like notifications ("John liked your post")
- [ ] Comment notifications ("Sarah commented on your post")
- [ ] Follow notifications ("Mike followed you")
- [ ] Notification bell icon with unread count
- [ ] Notification dropdown panel (last 10 notifications)
- [ ] Mark notification as read individually
- [ ] Mark all notifications as read
- [ ] Email notifications (optional)
- [ ] Notification sound/toast alerts

---

## TIER 6: Content Organization & Discovery 🏷️
**Priority:** MEDIUM
- [ ] Post categories/tags (e.g., #Tips, #Selling, #Seeking)
- [ ] Post hashtag system
- [ ] Search posts (full-text search)
- [ ] Trending/popular posts
- [ ] Trending hashtags
- [ ] Most liked posts
- [ ] Most commented posts
- [ ] Post scheduling (create draft, publish later)
- [ ] Pin important posts
- [ ] Report inappropriate content

---

## TIER 7: Farmer-Specific Features 🌾
**Priority:** LOW (nice-to-have, differentiator)
- [ ] Weather widget (location-based)
- [ ] Market rates tracker (crop prices)
- [ ] Farming tips & guides library
- [ ] Agricultural events calendar (planting season, weather alerts)
- [ ] Crop-specific Q&A section
- [ ] Resources library (videos, articles, PDFs)
- [ ] Fertilizer calculator
- [ ] Crop rotation guide

---

## TIER 8: Communities & Groups 👥
**Priority:** LOW (advanced feature)
- [ ] Create groups (e.g., "Rice Farmers of Dhaka")
- [ ] Join/leave groups
- [ ] Group posts/discussions
- [ ] Group members management
- [ ] Group admin features
- [ ] Local network/location-based groups
- [ ] Group-specific marketplace

---

## TIER 9: Safety & Moderation 🛡️
**Priority:** LOW (applies when scale grows)
- [ ] Spam detection system
- [ ] Report inappropriate content
- [ ] Admin dashboard to review reports
- [ ] Content moderation queue
- [ ] User verification for sellers
- [ ] Post moderation (auto-flag for review)
- [ ] User ban/suspend system
- [ ] Fake account detection

---

## TIER 10: Analytics & Insights 📊
**Priority:** LOW (advanced metrics)
- [ ] Post engagement metrics (likes, comments, shares)
- [ ] Marketplace seller analytics (views, inquiries, conversion rate)
- [ ] User growth charts
- [ ] Most active locations/regions
- [ ] Most active times for posting
- [ ] Trending crops/products
- [ ] Dashboard for sellers showing performance

---

## TIER 11: Mobile & UX Polish ✨
**Priority:** LOW (refinement)
- [ ] Responsive design improvements
- [ ] Dark mode toggle
- [ ] Loading states & spinners
- [ ] Empty states with helpful messages & illustrations
- [ ] Toast notifications for actions
- [ ] Keyboard navigation support
- [ ] Accessibility improvements (ARIA labels, color contrast)
- [ ] Favorite/bookmark UI refinement
- [ ] Image gallery for posts (multiple images per post)
- [ ] Infinite scroll feed loading

---

## Quick Wins (Easy to Add) ⚡
These could be added quickly if prioritized:
1. **Like button** - Simple +1 counter, small DB table
2. **Comments UI** - Add comment section below posts, store in DB
3. **User profile link** - Click username → user's post history
4. **Follow button** - Track follows in DB, show follower count
5. **Delete post** - Button on user's own posts
6. **Edit post** - Allow text edit (keep image)
7. **Search posts** - Filter feed by text search

---

## Database Tables Needed (Not Created Yet)
```
Likes (post_id, user_id, created_at, PRIMARY KEY)
Comments (comment_id, post_id, user_id, text, created_at)
Follows (follower_id, following_id, created_at, PRIMARY KEY)
Notifications (notification_id, recipient_id, sender_id, type, content_id, is_read)
Reviews (review_id, from_user_id, to_user_id, rating, text)
Groups (group_id, name, description, creator_id, created_at)
GroupMembers (group_id, user_id, joined_at)
PostDrafts (draft_id, user_id, text, image_path, created_at)
SavedPosts (user_id, post_id, saved_at)
Reports (report_id, reporter_id, content_type, content_id, reason, created_at)
```

---

## Recommended Implementation Order
1. **User Authentication** (TIER 1) - Foundation for everything
2. **Post Interactions** (TIER 2) - Likes & Comments
3. **User Profiles** (TIER 3) - Profiles & Follow System
4. **Marketplace Seller Features** (TIER 4) - Create/Edit Listings
5. **Notifications** (TIER 5) - Notification System
6. **Content Organization** (TIER 6) - Tags, Search, Trending
7. **Farmer Features** (TIER 7) - Weather, Prices, Tips
8. **Communities** (TIER 8) - Groups & Networks
9. **Safety & Moderation** (TIER 9) - Reporting, Admin Tools
10. **Analytics** (TIER 10) - Insights & Metrics
11. **UX Polish** (TIER 11) - Refinement & Accessibility

---

## Notes
- Notifications marked as lower priority per user feedback (will implement later)
- Direct messaging/chat feature is **SKIPPED** for now
- All features should maintain bilingual support (EN/BN)
- Image uploads should remain supported across all new features
- CSS Grid layout and design system should be preserved
