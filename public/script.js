// ============================================
// LANGUAGE + UI TEXT
// ============================================
// Dictionary for multilingual UI text (currently English only)
const dictionary = {
  en: {
    appTagline: "Farmer Community",
    sharePlaceholder: "Share your farming update...",
    addPhoto: "Add Photo",
    postBtn: "Post",
    photoPlaceholder: "Crop Photo Placeholder",
    like: "Like",
    comment: "Comment",
    share: "Share",
    home: "Home",
    marketplace: "Market",
    weather: "Weather",
    profile: "Profile",
    news: "News",
    guestModeMsg: "You're browsing as a guest.",
    loginToReact: "Login to post and react",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
    askingForHelp: "This is a help request",
    postNewAd: "Post Your Product",
    productTitle: "Product Title",
    productTitlePlaceholder: "e.g., Organic Rice Seeds",
    description: "Description",
    descriptionPlaceholder: "Describe your product in detail...",
    price: "Price",
    quantity: "Quantity",
    unit: "Unit",
    unitPlaceholder: "e.g., kg, pieces",
    category: "Category",
    location: "Location",
    productImage: "Product Image",
    imageUploadHint: "Click to select image",
    postAdBtn: "Post Product",
    cancelBtn: "Clear",
    marketSearchPlaceholder: "Search products",
  },
};

// Select all DOM elements that need translation
const body = document.body;
const translatableNodes = document.querySelectorAll("[data-i18n]");
const translatablePlaceholders = document.querySelectorAll("[data-i18n-placeholder]");

// Apply English text to all translatable elements on page load
function applyEnglishLanguage() {
  body.dataset.lang = "en";

  translatableNodes.forEach((node) => {
    const key = node.dataset.i18n;
    const translatedValue = dictionary.en[key];
    if (translatedValue) {
      node.textContent = translatedValue;
    }
  });

  translatablePlaceholders.forEach((node) => {
    const key = node.dataset.i18nPlaceholder;
    const translatedValue = dictionary.en[key];
    if (translatedValue) {
      node.setAttribute("placeholder", translatedValue);
    }
  });
}

applyEnglishLanguage();

// ============================================
// AUTH STATE + SHARED HELPERS
// ============================================
// Global object to track current user authentication status
const authState = {
  checked: false, // Whether we've already fetched auth status from server
  authenticated: false, // Whether user is currently logged in
  userId: null, // The logged-in user's ID (if authenticated)
};

// Store the current user's profile data (fetched from /api/auth/me)
let currentUserProfile = null;

// FUNCTION: showNotice() - Display custom in-page notification to user
// Replaces browser alert() with styled, auto-dismissing notifications
// Types: "info" (default), "success" (green), "error" (red)
function showNotice(message, type = "info") {
  const text = String(message || "Something went wrong.").trim() || "Something went wrong.";
  // Find or create the notification container
  let host = document.getElementById("appNoticeHost");

  if (!host) {
    host = document.createElement("div");
    host.id = "appNoticeHost";
    host.className = "app-notice-host";
    document.body.appendChild(host);
  }

  host.innerHTML = ""; // Clear any previous notifications

  // Create the notification element
  const notice = document.createElement("div");
  notice.className = `app-notice app-notice-${type}`;
  notice.setAttribute("role", type === "error" ? "alert" : "status");
  notice.setAttribute("aria-live", type === "error" ? "assertive" : "polite");

  // Add message text
  const textNode = document.createElement("p");
  textNode.className = "app-notice-text";
  textNode.textContent = text;

  // Add close button
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "app-notice-close";
  closeBtn.textContent = "OK";

  // Function to dismiss the notification with animation
  const dismiss = () => {
    notice.classList.remove("show");
    window.setTimeout(() => {
      if (host && host.contains(notice)) {
        host.removeChild(notice);
      }
    }, 180);
  };

  closeBtn.addEventListener("click", dismiss);

  // Assemble notification
  notice.appendChild(textNode);
  notice.appendChild(closeBtn);
  host.appendChild(notice);

  // Trigger CSS animation
  window.requestAnimationFrame(() => {
    notice.classList.add("show");
  });

  // Auto-dismiss after delay (4.2s for errors, 2.8s for success/info)
  window.setTimeout(dismiss, type === "error" ? 4200 : 2800);
}

// FUNCTION: getAuthState() - Fetch and cache authentication status from server
// Makes /api/auth/check request to determine if user is logged in
// Caches result unless forceRefresh is true
async function getAuthState(forceRefresh = false) {
  // Return cached auth state if already fetched and not forcing refresh
  if (authState.checked && !forceRefresh) {
    return authState;
  }

  try {
    const response = await fetch("/api/auth/check");
    const data = await response.json();
    authState.checked = true;
    authState.authenticated = Boolean(data.authenticated);
    authState.userId = data.userId || null;
  } catch (error) {
    console.error("Auth check error:", error);
    authState.checked = true;
    authState.authenticated = false;
    authState.userId = null;
  }

  return authState;
}

// FUNCTION: getCurrentUserProfile() - Fetch current user's full profile from /api/auth/me
// Only works if user is authenticated
// Caches result unless forceRefresh is true
async function getCurrentUserProfile(forceRefresh = false) {
  const state = await getAuthState(forceRefresh);
  if (!state.authenticated) {
    currentUserProfile = null;
    return null;
  }

  // Return cached profile if already fetched and not forcing refresh
  if (currentUserProfile && !forceRefresh) {
    return currentUserProfile;
  }

  try {
    const response = await fetch("/api/auth/me");
    if (!response.ok) {
      currentUserProfile = null;
      return null;
    }
    currentUserProfile = await response.json();
    return currentUserProfile;
  } catch (error) {
    console.error("Get current profile error:", error);
    currentUserProfile = null;
    return null;
  }
}

// FUNCTION: escapeHtml() - Escape HTML special characters to prevent injection
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// FUNCTION: getAvatarInitials() - Generate 2-letter avatar initials from name
function getAvatarInitials(name) {
  const safeName = String(name || "Anonymous User").trim();
  const parts = safeName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "AU"; // Fallback for Anonymous User
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  // Take first letter of first name + first letter of last name
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// FUNCTION: formatRelativeTime() - Convert timestamp to relative time text (e.g., "5 minutes ago")
function formatRelativeTime(dateValue) {
  const now = new Date();
  const postTime = new Date(dateValue);
  const diffSeconds = Math.max(0, Math.floor((now - postTime) / 1000));

  if (diffSeconds < 60) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}

// FUNCTION: profileUrlForUser() - Generate URL to visit a user's profile page
function profileUrlForUser(userId) {
  return `profile.html?userId=${encodeURIComponent(userId)}`;
}

// FUNCTION: feedPostUrl() - Generate URL to view a specific post on the feed
function feedPostUrl(postId) {
  return `index.html?postId=${encodeURIComponent(postId)}`;
}

// FUNCTION: formatRoleLabel() - Convert database role to display label (e.g., "Verified Expert" -> "Expert")
function formatRoleLabel(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "verified expert") {
    return "Expert";
  }
  if (normalized === "general vendor") {
    return "Seller";
  }
  return role || "User";
}

// FUNCTION: renderPosts() - Generate HTML for feed posts and insert into container
// Handles different post types (regular, news shares) with like/comment buttons
function renderPosts(posts, container) {
  if (!container) {
    return;
  }

  // Show "No posts" message if empty
  if (!Array.isArray(posts) || posts.length === 0) {
    container.innerHTML = '<article class="post-card"><p class="post-text">No posts yet.</p></article>';
    return;
  }

  // Check if current user is admin (can moderate posts)
  const canAdminModerate = currentUserProfile && currentUserProfile.role === "Admin";

  container.innerHTML = posts
    .map((post, index) => {
      const userName = escapeHtml(post.userName || `User #${post.userId}`);
      const createdText = formatRelativeTime(post.createdAt);
      const avatarInitials = escapeHtml(getAvatarInitials(userName));
      const avatarClass = index % 2 === 0 ? "avatar-a" : "avatar-b";
      const profileUrl = profileUrlForUser(post.userId);
      const textContent = escapeHtml(post.textContent || "");
      const roleTag = post.userRole === "Verified Expert"
        ? '<span class="expert-share-tag">Expert</span>'
        : post.userRole === "General Vendor"
          ? '<span class="seller-share-tag">Seller</span>'
          : "";

      let postBody = "";
      if (post.postType === "news_share") {
        const newsTitle = escapeHtml(post.sharedNewsTitle || "Shared news");
        const newsExcerpt = escapeHtml(post.sharedNewsExcerpt || "");
        const newsSource = escapeHtml(post.sharedNewsSource || "Unknown source");
        const newsCategory = escapeHtml(post.sharedNewsCategory || "News");
        const newsUrl = post.sharedNewsUrl ? escapeHtml(post.sharedNewsUrl) : "";
        const sourceLine = `${newsCategory} - ${newsSource}`;

        postBody = `
          ${textContent ? `<p class="post-text">${textContent}</p>` : ""}
          <div class="post-news-share">
            <h3>${newsTitle}</h3>
            ${newsExcerpt ? `<p class="post-text">${newsExcerpt}</p>` : ""}
            <p class="post-news-meta">${sourceLine}</p>
            ${newsUrl ? `<a class="post-news-link" href="${newsUrl}" target="_blank" rel="noopener noreferrer">Read original</a>` : ""}
          </div>
        `;
      } else {
        const postPhotoSection = post.imagePath
          ? `<div class="post-photo post-photo-has-image" role="img" aria-label="Uploaded post image"><img class="post-photo-img" src="${escapeHtml(post.imagePath)}" alt="Post image" /></div>`
          : "";

        postBody = `
          <p class="post-text">${textContent}</p>
          ${postPhotoSection}
        `;
      }

      const safePostId = Number(post.id) || 0;

      return `
      <article class="post-card" id="post-${safePostId}" data-post-id="${safePostId}">
        <header class="post-head">
          <a class="post-profile-link" href="${profileUrl}" aria-label="Open ${userName} profile">
            <div class="avatar ${avatarClass}">${avatarInitials}</div>
          </a>
          <div class="post-user-meta">
            <h2 class="post-user"><a class="post-profile-link" href="${profileUrl}">${userName}</a></h2>
            <p class="post-time">${createdText} ${roleTag}</p>
          </div>
        </header>
        ${postBody}
        <footer class="post-actions" aria-label="Post actions">
          <button type="button" class="js-like-btn ${post.likedByCurrentUser ? "liked" : ""}" data-post-id="${safePostId}"><i class="fa-regular fa-heart"></i> <span>${dictionary.en.like} (${Number(post.likesCount) || 0})</span></button>
          <button type="button" class="js-comment-btn" data-post-id="${safePostId}"><i class="fa-regular fa-comment"></i> <span>${dictionary.en.comment} (${Number(post.commentsCount) || 0})</span></button>
          <button type="button"><i class="fa-solid fa-share-nodes"></i> <span>${dictionary.en.share}</span></button>
          ${canAdminModerate ? `<button type="button" class="js-admin-delete-post" data-post-id="${safePostId}"><i class="fa-solid fa-trash"></i> <span>Delete</span></button>` : ""}
        </footer>
        <section class="post-comment-panel" data-post-id="${safePostId}" hidden>
          <div class="post-comments-list" data-post-id="${safePostId}">
            <p class="post-comments-empty">No comments yet.</p>
          </div>
          <label class="post-comment-label" for="comment-input-${safePostId}">Write your comment</label>
          <textarea id="comment-input-${safePostId}" class="post-comment-input" data-post-id="${safePostId}" rows="2" placeholder="Write your comment..."></textarea>
          <div class="post-comment-actions">
            <button type="button" class="js-submit-comment" data-post-id="${safePostId}">Send</button>
            <button type="button" class="js-cancel-comment" data-post-id="${safePostId}">Cancel</button>
          </div>
        </section>
      </article>`;
    })
    .join("");
}

// Highlight a target post when opening feed with a postId query parameter.
function focusPostInFeed(postId, container) {
  if (!container || !Number.isInteger(postId) || postId <= 0) {
    return;
  }

  const targetPost = container.querySelector(`#post-${postId}`);
  if (!targetPost) {
    return;
  }

  targetPost.scrollIntoView({ behavior: "smooth", block: "center" });
  targetPost.classList.add("drag-active");
  setTimeout(() => targetPost.classList.remove("drag-active"), 1800);
}

async function fetchPosts({ userId = null, container = null, targetPostId = null } = {}) {
  if (!container) {
    return;
  }

  try {
    const query = Number.isInteger(userId) && userId > 0 ? `?userId=${userId}` : "";
    const response = await fetch(`/api/posts${query}`);
    if (!response.ok) {
      throw new Error("Failed to fetch posts");
    }

    const posts = await response.json();
    renderPosts(posts, container);
    focusPostInFeed(targetPostId, container);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<article class="post-card"><p class="post-text">Unable to load posts.</p></article>';
  }
}

function renderComments(comments, listContainer) {
  if (!listContainer) {
    return;
  }

  if (!Array.isArray(comments) || comments.length === 0) {
    listContainer.innerHTML = '<p class="post-comments-empty">No comments yet.</p>';
    return;
  }

  listContainer.innerHTML = comments
    .map((comment) => {
      const commenterName = escapeHtml(comment.userName || `User #${comment.userId}`);
      const commenterInitials = escapeHtml(getAvatarInitials(commenterName));
      const commentText = escapeHtml(comment.textContent || "");
      const createdText = formatRelativeTime(comment.createdAt);

      return `
        <article class="post-comment-item">
          <div class="post-comment-avatar">${commenterInitials}</div>
          <div class="post-comment-body">
            <p class="post-comment-meta"><strong>${commenterName}</strong> - ${createdText}</p>
            <p class="post-comment-text">${commentText}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateCommentCountText(feedList, postId, commentsCount) {
  if (!feedList || !Number.isInteger(postId) || postId <= 0) {
    return;
  }

  const commentButton = feedList.querySelector(`.js-comment-btn[data-post-id="${postId}"] span`);
  if (!commentButton) {
    return;
  }

  commentButton.textContent = `${dictionary.en.comment} (${commentsCount})`;
}

function getMarketplaceIconClass(ad) {
  const category = String(ad.category || "").toLowerCase();
  const title = String(ad.productTitle || "").toLowerCase();

  if (category.includes("seed")) {
    return "fa-seedling";
  }

  if (category.includes("produce") || title.includes("chili") || title.includes("rice")) {
    return "fa-wheat-awn";
  }

  if (category.includes("tool") || category.includes("equipment")) {
    return "fa-screwdriver-wrench";
  }

  return "fa-store";
}

function formatPrice(ad) {
  const priceValue = Number(ad.price);
  const safePrice = Number.isFinite(priceValue)
    ? priceValue.toFixed(2).replace(/\.00$/, "")
    : String(ad.price || "0");
  const unit = ad.unit ? ` / ${escapeHtml(ad.unit)}` : "";
  return `Rs ${safePrice}${unit}`;
}

function renderMarketplaceAds(ads, marketplaceGrid) {
  if (!marketplaceGrid) {
    return;
  }

  if (!Array.isArray(ads) || ads.length === 0) {
    marketplaceGrid.innerHTML = '<article class="market-card"><div class="market-body"><p class="market-seller">No marketplace ads yet.</p></div></article>';
    return;
  }

  marketplaceGrid.innerHTML = ads
    .map((ad) => {
      const productTitle = escapeHtml(ad.productTitle || "Untitled Product");
      const sellerName = escapeHtml(ad.sellerName || "Unknown Seller");
      const sellerMobile = escapeHtml(ad.sellerMobile || "N/A");
      const verifiedBadge = ad.isVerifiedSeller
        ? '<span class="verified-badge"><i class="fa-solid fa-circle-check"></i> Verified</span>'
        : "";
      const imageIconClass = getMarketplaceIconClass(ad);
      const sellerProfileUrl = profileUrlForUser(ad.sellerId);

      return `
      <article class="market-card">
        <div class="market-image">
          <i class="fa-solid ${imageIconClass}"></i>
          <span>Product Image</span>
        </div>
        <div class="market-body">
          <h2 class="market-title">${productTitle}</h2>
          <p class="market-price">${formatPrice(ad)}</p>
          <p class="market-seller">
            <a class="post-profile-link" href="${sellerProfileUrl}">${sellerName}</a>
            ${verifiedBadge}
          </p>
          <div class="market-rating" aria-label="5 star rating">
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
          </div>
          <button class="call-seller-btn" type="button">Call Seller: ${sellerMobile}</button>
        </div>
      </article>`;
    })
    .join("");
}

// ============================================
// NOTIFICATION CENTER
// ============================================
let notificationRefreshInterval = null;

async function fetchNotifications() {
  try {
    const response = await fetch("/api/notifications?limit=50");
    if (!response.ok) {
      throw new Error("Failed to fetch notifications");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { notifications: [], unreadCount: 0 };
  }
}

function updateNotificationBadge(unreadCount) {
  const badge = document.getElementById("notificationBadge");
  if (!badge) return;

  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
    badge.style.display = "block";
  } else {
    badge.style.display = "none";
  }
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function renderNotifications(notifications) {
  const notificationList = document.getElementById("notificationList");
  if (!notificationList) return;

  if (!notifications || notifications.length === 0) {
    notificationList.innerHTML = '<div class="notification-empty">No notifications</div>';
    return;
  }

  notificationList.innerHTML = notifications
    .map((notif) => {
      const actorName = escapeHtml(notif.actorName || "Someone");
      const timeAgo = formatTimeAgo(notif.createdAt);
      let message = "";
      let icon = "";

      if (notif.notificationType === "like") {
        message = `${actorName} liked your post`;
        icon = "fa-heart";
      } else if (notif.notificationType === "comment") {
        message = `${actorName} commented on your post`;
        icon = "fa-comment";
      } else if (notif.notificationType === "help_request") {
        message = `${actorName} posted a help request`;
        icon = "fa-circle-exclamation";
      }

      const readClass = notif.isRead ? "notification-item-read" : "notification-item-unread";

      return `
        <div class="notification-item ${readClass}" data-notification-id="${notif.id}">
          <div class="notification-avatar">${escapeHtml(getAvatarInitials(notif.actorName || "?"))}</div>
          <div class="notification-content">
            <div class="notification-message">
              <i class="fa-solid ${icon}"></i>
              <span>${message}</span>
            </div>
            <div class="notification-preview">${escapeHtml((notif.postContent || "").substring(0, 50))}${(notif.postContent || "").length > 50 ? "..." : ""}</div>
            <div class="notification-time">${timeAgo}</div>
          </div>
        </div>
      `;
    })
    .join("");

  // Add click handlers to notifications
  const notificationItems = notificationList.querySelectorAll(".notification-item");
  notificationItems.forEach((item) => {
    item.addEventListener("click", async () => {
      const notifId = item.dataset.notificationId;
      if (item.classList.contains("notification-item-unread")) {
        try {
          await fetch(`/api/notifications/${notifId}/read`, { method: "POST" });
          item.classList.remove("notification-item-unread");
          item.classList.add("notification-item-read");
          await loadNotifications();
        } catch (error) {
          console.error("Error marking notification as read:", error);
        }
      }
    });
  });
}

async function loadNotifications() {
  const data = await fetchNotifications();
  updateNotificationBadge(data.unreadCount);
  renderNotifications(data.notifications);
}

function initNotificationCenter() {
  const notificationToggle = document.getElementById("notificationToggle");
  const notificationPanel = document.getElementById("notificationPanel");
  const readAllBtn = document.getElementById("readAllBtn");

  if (!notificationToggle || !notificationPanel) return;

  // Toggle notification panel visibility
  notificationToggle.addEventListener("click", async () => {
    if (notificationPanel.style.display === "none") {
      notificationPanel.style.display = "block";
      await loadNotifications();
    } else {
      notificationPanel.style.display = "none";
    }
  });

  // Mark all as read button
  if (readAllBtn) {
    readAllBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/notifications/read-all", { method: "POST" });
        await loadNotifications();
      } catch (error) {
        console.error("Error marking all as read:", error);
      }
    });
  }

  // Close panel when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#notificationCenter")) {
      notificationPanel.style.display = "none";
    }
  });

  // Load notifications immediately and refresh every 30 seconds
  loadNotifications();
  if (notificationRefreshInterval) {
    clearInterval(notificationRefreshInterval);
  }
  notificationRefreshInterval = setInterval(loadNotifications, 30000);
}

// ============================================
// FEED PAGE
// ============================================
function initFeedPage() {
  const feedList = document.querySelector(".feed-list");
  const postBtn = document.querySelector(".post-btn");
  const postTextInput = document.getElementById("postText");
  const postPhotoInput = document.getElementById("postPhoto");
  const navPostBtn = document.querySelector(".nav-post");
  const createPostCard = document.getElementById("createPostCard");
  const composerAvatar = createPostCard ? createPostCard.querySelector(".avatar-owner") : null;
  const postImagePreviewWrap = document.getElementById("postImagePreviewWrap");
  const postImagePreview = document.getElementById("postImagePreview");
  const removePostImageBtn = document.getElementById("removePostImage");
  const composeParam = new URLSearchParams(window.location.search).get("compose");
  const targetPostIdParam = Number.parseInt(new URLSearchParams(window.location.search).get("postId"), 10);
  let currentPreviewUrl = null;
  let composerSelectedImageFile = null;

  async function loadPostComments(postId, { forceRefresh = false } = {}) {
    const postCard = feedList.querySelector(`#post-${postId}`);
    const commentPanel = postCard ? postCard.querySelector(`.post-comment-panel[data-post-id="${postId}"]`) : null;
    const commentsList = commentPanel ? commentPanel.querySelector(`.post-comments-list[data-post-id="${postId}"]`) : null;
    if (!postCard || !commentPanel || !commentsList) {
      return [];
    }

    if (!forceRefresh && commentsList.dataset.loaded === "true") {
      return [];
    }

    commentsList.innerHTML = '<p class="post-comments-empty">Loading comments...</p>';

    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load comments.");
      }

      renderComments(data, commentsList);
      commentsList.dataset.loaded = "true";
      updateCommentCountText(feedList, postId, Array.isArray(data) ? data.length : 0);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(error);
      commentsList.innerHTML = '<p class="post-comments-empty">Unable to load comments.</p>';
      return [];
    }
  }

  if (!feedList) {
    return;
  }

  function setComposerImageFile(file) {
    if (!file) {
      clearImagePreview();
      return;
    }

    if (!String(file.type || "").startsWith("image/")) {
      clearImagePreview({ clearInput: true });
      showNotice("Please select a valid image file.", "error");
      return;
    }

    clearImagePreview();
    composerSelectedImageFile = file;
    currentPreviewUrl = URL.createObjectURL(file);

    if (postImagePreview) {
      postImagePreview.src = currentPreviewUrl;
    }

    if (postImagePreviewWrap) {
      postImagePreviewWrap.hidden = false;
    }
  }

  if (postPhotoInput) {
    postPhotoInput.addEventListener("change", () => {
      const selectedImageFile = postPhotoInput.files ? postPhotoInput.files[0] : null;
      setComposerImageFile(selectedImageFile);
    });
  }

  if (createPostCard) {
    const activateDropState = () => createPostCard.classList.add("drag-active");
    const deactivateDropState = () => createPostCard.classList.remove("drag-active");

    ["dragenter", "dragover"].forEach((eventName) => {
      createPostCard.addEventListener(eventName, (event) => {
        event.preventDefault();
        activateDropState();
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      createPostCard.addEventListener(eventName, (event) => {
        event.preventDefault();
        deactivateDropState();
      });
    });

    createPostCard.addEventListener("drop", (event) => {
      const droppedFile = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
      if (!droppedFile) {
        return;
      }

      setComposerImageFile(droppedFile);
    });
  }

  if (removePostImageBtn) {
    removePostImageBtn.addEventListener("click", () => {
      clearImagePreview({ clearInput: true });
    });
  }

  async function submitComposerPost() {
    const textContent = postTextInput ? postTextInput.value.trim() : "";
    const selectedImageFile = composerSelectedImageFile || (postPhotoInput && postPhotoInput.files ? postPhotoInput.files[0] : null);
    const isHelpRequestCheckbox = document.getElementById("isHelpRequest");
    const isHelpRequest = isHelpRequestCheckbox ? isHelpRequestCheckbox.checked : false;

    if (!textContent && !selectedImageFile) {
      if (postTextInput) {
        postTextInput.focus();
      }
      return false;
    }

    const formData = new FormData();
    formData.append("textContent", textContent);
    formData.append("isHelpRequest", isHelpRequest);
    if (selectedImageFile) {
      formData.append("image", selectedImageFile);
    }

    const response = await fetch("/api/posts", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to create post");
    }

    if (postTextInput) {
      postTextInput.value = "";
    }
    if (isHelpRequestCheckbox) {
      isHelpRequestCheckbox.checked = false;
    }
    clearImagePreview({ clearInput: true });
    await fetchPosts({ container: feedList });
    return true;
  }

  feedList.addEventListener("click", async (event) => {
    const likeButton = event.target.closest(".js-like-btn");
    if (likeButton) {
      const state = await getAuthState();
      if (!state.authenticated) {
        window.location.href = "/login.html";
        return;
      }

      const postId = Number.parseInt(likeButton.dataset.postId, 10);
      if (!Number.isInteger(postId) || postId <= 0) {
        return;
      }

      try {
        const response = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
        const data = await response.json();
        if (!response.ok) {
          showNotice(data.message || "Failed to update like.", "error");
          return;
        }

        await fetchPosts({ container: feedList, targetPostId: postId });
      } catch (error) {
        console.error(error);
        showNotice("Failed to update like.", "error");
      }
      return;
    }

    const commentButton = event.target.closest(".js-comment-btn");
    if (commentButton) {
      const postId = Number.parseInt(commentButton.dataset.postId, 10);
      if (!Number.isInteger(postId) || postId <= 0) {
        return;
      }

      const postCard = feedList.querySelector(`#post-${postId}`);
      const commentPanel = postCard ? postCard.querySelector(`.post-comment-panel[data-post-id="${postId}"]`) : null;
      const commentInput = commentPanel ? commentPanel.querySelector(`.post-comment-input[data-post-id="${postId}"]`) : null;
      if (!commentPanel || !commentInput) {
        return;
      }

      if (!commentPanel.hidden) {
        commentPanel.hidden = true;
        return;
      }

      commentPanel.hidden = false;
      await loadPostComments(postId);
      postCard.scrollIntoView({ behavior: "smooth", block: "center" });

      const state = await getAuthState();
      if (state.authenticated) {
        commentInput.focus();
        const inputLength = commentInput.value.length;
        commentInput.setSelectionRange(inputLength, inputLength);
      }
      return;
    }

    const cancelCommentButton = event.target.closest(".js-cancel-comment");
    if (cancelCommentButton) {
      const postId = Number.parseInt(cancelCommentButton.dataset.postId, 10);
      if (!Number.isInteger(postId) || postId <= 0) {
        return;
      }

      const postCard = feedList.querySelector(`#post-${postId}`);
      const commentPanel = postCard ? postCard.querySelector(`.post-comment-panel[data-post-id="${postId}"]`) : null;
      const commentInput = commentPanel ? commentPanel.querySelector(`.post-comment-input[data-post-id="${postId}"]`) : null;
      if (!commentPanel || !commentInput) {
        return;
      }

      commentInput.value = "";
      commentPanel.hidden = true;
      return;
    }

    const submitCommentButton = event.target.closest(".js-submit-comment");
    if (submitCommentButton) {
      const state = await getAuthState();
      if (!state.authenticated) {
        window.location.href = "/login.html";
        return;
      }

      const postId = Number.parseInt(submitCommentButton.dataset.postId, 10);
      if (!Number.isInteger(postId) || postId <= 0) {
        return;
      }

      const postCard = feedList.querySelector(`#post-${postId}`);
      const commentPanel = postCard ? postCard.querySelector(`.post-comment-panel[data-post-id="${postId}"]`) : null;
      const commentInput = commentPanel ? commentPanel.querySelector(`.post-comment-input[data-post-id="${postId}"]`) : null;
      if (!commentPanel || !commentInput) {
        return;
      }

      const trimmedComment = String(commentInput.value || "").trim();
      if (!trimmedComment) {
        showNotice("Comment cannot be empty.", "error");
        commentInput.focus();
        return;
      }

      try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textContent: trimmedComment }),
        });
        const data = await response.json();
        if (!response.ok) {
          showNotice(data.message || "Failed to add comment.", "error");
          return;
        }

        commentInput.value = "";
        await loadPostComments(postId, { forceRefresh: true });
      } catch (error) {
        console.error(error);
        showNotice("Failed to add comment.", "error");
      }
      return;
    }

    const deleteButton = event.target.closest(".js-admin-delete-post");
    if (!deleteButton) {
      return;
    }

    const me = await getCurrentUserProfile();
    if (!me || me.role !== "Admin") {
      showNotice("Admin access required.", "error");
      return;
    }

    const postId = Number.parseInt(deleteButton.dataset.postId, 10);
    if (!Number.isInteger(postId) || postId <= 0) {
      return;
    }

    const confirmed = window.confirm("Delete this post as admin?");
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        showNotice(data.message || "Failed to delete post.", "error");
        return;
      }

      await fetchPosts({ container: feedList });
    } catch (error) {
      console.error(error);
      showNotice("Failed to delete post.", "error");
    }
  });

  if (postBtn && postTextInput) {
    postBtn.addEventListener("click", async () => {
      try {
        await submitComposerPost();
      } catch (error) {
        console.error(error);
        showNotice("Could not publish post.", "error");
      }
    });
  }

  if (navPostBtn) {
    navPostBtn.addEventListener("click", async (event) => {
      event.preventDefault();

      const state = await getAuthState();
      if (!state.authenticated) {
        window.location.href = "/login.html";
        return;
      }

      if (createPostCard) {
        createPostCard.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      try {
        const posted = await submitComposerPost();
        if (!posted && postTextInput) {
          postTextInput.focus();
        }
      } catch (error) {
        console.error(error);
        showNotice("Could not publish post.", "error");
      }
    });
  }

  const guestModePrompt = document.getElementById("guestModePrompt");
  const loginLink = document.getElementById("loginLink");
  const signupLink = document.getElementById("signupLink");
  const logoutBtn = document.getElementById("logoutBtn");

  getAuthState().then((state) => {
    if (state.authenticated) {
      if (createPostCard) createPostCard.style.display = "block";
      if (guestModePrompt) guestModePrompt.style.display = "none";
      if (loginLink) loginLink.style.display = "none";
      if (signupLink) signupLink.style.display = "none";
      if (logoutBtn) {
        logoutBtn.style.display = "block";
        logoutBtn.addEventListener("click", async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.href = "/index.html";
        });
      }

      // Initialize notification center for authenticated users
      initNotificationCenter();
      return;
    }

    if (createPostCard) createPostCard.style.display = "none";
    if (guestModePrompt) guestModePrompt.style.display = "block";
    if (loginLink) loginLink.style.display = "inline-block";
    if (signupLink) signupLink.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
  });

  if (composeParam === "1" && postTextInput) {
    if (createPostCard) {
      createPostCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    postTextInput.focus();
  }

  fetchPosts({ container: feedList, targetPostId: Number.isInteger(targetPostIdParam) ? targetPostIdParam : null });
}

// ============================================
// MARKETPLACE PAGE
// ============================================
function initMarketplacePage() {
  const marketplaceGrid = document.querySelector(".market-grid");
  if (!marketplaceGrid) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initMarketplacePage, { once: true });
    } else {
      window.setTimeout(initMarketplacePage, 0);
    }
    return;
  }

  let allMarketplaceAds = [];
  const searchInput = document.querySelector(".market-filter-item.search-field input");
  const categorySelect = document.getElementById("categorySelect");
  const locationSelect = document.getElementById("locationSelect");

  function filterMarketplaceAds() {
    if (!Array.isArray(allMarketplaceAds)) {
      return;
    }

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const selectedCategory = categorySelect ? categorySelect.value : "";
    const selectedLocation = locationSelect ? locationSelect.value : "";

    const filtered = allMarketplaceAds.filter((ad) => {
      const matchesSearch =
        !searchTerm ||
        String(ad.productTitle || "").toLowerCase().includes(searchTerm) ||
        String(ad.description || "").toLowerCase().includes(searchTerm);

      const matchesCategory = !selectedCategory || ad.category === selectedCategory;
      const matchesLocation = !selectedLocation || ad.location === selectedLocation;

      return matchesSearch && matchesCategory && matchesLocation;
    });

    renderMarketplaceAds(filtered, marketplaceGrid);
  }

  if (searchInput) {
    searchInput.addEventListener("input", filterMarketplaceAds);
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", filterMarketplaceAds);
  }

  if (locationSelect) {
    locationSelect.addEventListener("change", filterMarketplaceAds);
  }

  async function fetchMarketplaceAds() {
    try {
      const response = await fetch("/api/marketplace");
      if (!response.ok) {
        throw new Error("Failed to fetch marketplace ads");
      }

      allMarketplaceAds = await response.json();
      filterMarketplaceAds();
    } catch (error) {
      console.error(error);
      marketplaceGrid.innerHTML = '<article class="market-card"><div class="market-body"><p class="market-seller">Unable to load marketplace ads.</p></div></article>';
    }
  }

  fetchMarketplaceAds();
  const sellerPostingCard = document.getElementById("sellerPostingCard");
  const marketplaceForm = document.getElementById("marketplaceForm");
  const adImage = document.getElementById("adImage");
  const adImagePreview = document.getElementById("adImagePreview");
  const adImagePreviewImg = document.getElementById("adImagePreviewImg");
  const removeAdImageBtn = document.getElementById("removeAdImage");
  let selectedAdImageFile = null;

    // Check if user is a seller and show posting form
    async function checkSellerStatus() {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          if (sellerPostingCard) sellerPostingCard.style.display = "none";
          return;
        }

        const profile = await response.json();
        const isSeller = profile.role === "General Vendor" || profile.role === "Verified Vendor";
        if (sellerPostingCard) {
          sellerPostingCard.style.display = isSeller ? "block" : "none";
        }
      } catch (error) {
        console.error("Error checking seller status:", error);
        if (sellerPostingCard) sellerPostingCard.style.display = "none";
      }
    }

    // Handle image preview for marketplace ad
    if (adImage) {
      adImage.addEventListener("change", (e) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (file) {
          selectedAdImageFile = file;
          const reader = new FileReader();
          reader.onload = (event) => {
            if (adImagePreview && adImagePreviewImg) {
              adImagePreviewImg.src = event.target.result;
              adImagePreview.style.display = "block";
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Handle remove image button
    if (removeAdImageBtn) {
      removeAdImageBtn.addEventListener("click", (e) => {
        e.preventDefault();
        selectedAdImageFile = null;
        if (adImage) adImage.value = "";
        if (adImagePreview) adImagePreview.style.display = "none";
      });
    }

    // Handle marketplace form submission
    if (marketplaceForm) {
      marketplaceForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append("productTitle", document.getElementById("adTitle").value);
        formData.append("description", document.getElementById("adDescription").value);
        formData.append("price", document.getElementById("adPrice").value);
        formData.append("category", document.getElementById("adCategory").value);
        formData.append("location", document.getElementById("adLocation").value);
        formData.append("quantity", document.getElementById("adQuantity").value || "");
        formData.append("unit", document.getElementById("adUnit").value);

        if (selectedAdImageFile) {
          formData.append("image", selectedAdImageFile);
        }

        try {
          const response = await fetch("/api/marketplace", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();
          if (!response.ok) {
            showNotice(data.message || "Failed to post product", "error");
            return;
          }

          showNotice("Product posted successfully!", "success");
          marketplaceForm.reset();
          selectedAdImageFile = null;
          if (adImagePreview) adImagePreview.style.display = "none";
          await fetchMarketplaceAds();
        } catch (error) {
          console.error("Error posting product:", error);
          showNotice("Failed to post product", "error");
        }
      });
    }

    function filterMarketplaceAds() {
      if (!Array.isArray(allMarketplaceAds)) {
        return;
      }

      const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
      const selectedCategory = categorySelect ? categorySelect.value : "";
      const selectedLocation = locationSelect ? locationSelect.value : "";

      const filtered = allMarketplaceAds.filter((ad) => {
        const matchesSearch =
          !searchTerm ||
          String(ad.productTitle || "").toLowerCase().includes(searchTerm) ||
          String(ad.description || "").toLowerCase().includes(searchTerm);

        const matchesCategory = !selectedCategory || ad.category === selectedCategory;
        const matchesLocation = !selectedLocation || ad.location === selectedLocation;

        return matchesSearch && matchesCategory && matchesLocation;
      });

      renderMarketplaceAds(filtered, marketplaceGrid);
    }

    if (searchInput) {
      searchInput.addEventListener("input", filterMarketplaceAds);
    }

    if (categorySelect) {
      categorySelect.addEventListener("change", filterMarketplaceAds);
    }

    if (locationSelect) {
      locationSelect.addEventListener("change", filterMarketplaceAds);
    }

    async function fetchMarketplaceAds() {
      try {
        const response = await fetch("/api/marketplace");
        if (!response.ok) {
          throw new Error("Failed to fetch marketplace ads");
        }

        allMarketplaceAds = await response.json();
        filterMarketplaceAds();
      } catch (error) {
        console.error(error);
        marketplaceGrid.innerHTML = '<article class="market-card"><div class="market-body"><p class="market-seller">Unable to load marketplace ads.</p></div></article>';
      }
    }

    // Initialize
    checkSellerStatus();
    fetchMarketplaceAds();
  }

function renderRequestList(container, rows, withActions, onAccept, onDiscard) {
  if (!container) {
    return;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = '<div class="request-item"><p class="request-item-name">No requests</p></div>';
    return;
  }

  container.innerHTML = rows
    .map((row) => {
      const profileUrl = profileUrlForUser(row.userId);
      const actions = withActions
        ? `<div class="request-actions">
             <button class="action-btn request-accept" data-request-id="${row.id}">Accept</button>
             <button class="action-btn secondary request-discard" data-request-id="${row.id}">Discard</button>
           </div>`
        : "";

      return `
        <article class="request-item">
          <div class="request-item-top">
            <div>
              <p class="request-item-name"><a class="post-profile-link" href="${profileUrl}">${escapeHtml(row.fullName)}</a></p>
              <p class="request-item-role">${escapeHtml(row.role || "User")}</p>
            </div>
          </div>
          ${actions}
        </article>
      `;
    })
    .join("");

  if (!withActions) {
    return;
  }

  container.querySelectorAll(".request-accept").forEach((button) => {
    button.addEventListener("click", () => onAccept(Number(button.dataset.requestId)));
  });

  container.querySelectorAll(".request-discard").forEach((button) => {
    button.addEventListener("click", () => onDiscard(Number(button.dataset.requestId)));
  });
}

function renderOutgoingRequestList(container, rows, onCancel) {
  if (!container) {
    return;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = '<div class="request-item"><p class="request-item-name">No requests</p></div>';
    return;
  }

  container.innerHTML = rows
    .map((row) => {
      const profileUrl = profileUrlForUser(row.userId);

      return `
        <article class="request-item">
          <div class="request-item-top">
            <div>
              <p class="request-item-name"><a class="post-profile-link" href="${profileUrl}">${escapeHtml(row.fullName)}</a></p>
              <p class="request-item-role">${escapeHtml(row.role || "User")}</p>
            </div>
          </div>
          <div class="request-actions">
            <button class="action-btn secondary request-cancel" data-request-id="${row.id}">Cancel</button>
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll(".request-cancel").forEach((button) => {
    button.addEventListener("click", () => onCancel(Number(button.dataset.requestId)));
  });
}

// ============================================
// PROFILE PAGE
// ============================================
async function initProfilePage() {
  const profileRoot = document.getElementById("profilePage");
  if (!profileRoot) {
    return;
  }

  await getAuthState();

  const params = new URLSearchParams(window.location.search);
  let viewedUserId = Number.parseInt(params.get("userId"), 10);
  if (!Number.isInteger(viewedUserId) || viewedUserId <= 0) {
    viewedUserId = authState.userId || 0;
  }

  if (!viewedUserId) {
    profileRoot.innerHTML = '<section class="profile-panel"><p>Please login to view your profile.</p><a class="action-btn" href="login.html">Login</a></section>';
    return;
  }

  const profilePosts = document.getElementById("profilePosts");
  const connectionRequestsPanel = document.getElementById("connectionRequestsPanel");
  const connectionsPanel = document.getElementById("connectionsPanel");
  const incomingRequests = document.getElementById("incomingRequests");
  const outgoingRequests = document.getElementById("outgoingRequests");
  const connectionsList = document.getElementById("connectionsList");
  const likedPostsPanel = document.getElementById("likedPostsPanel");
  const likedPostsList = document.getElementById("likedPostsList");
  const commentedPostsPanel = document.getElementById("commentedPostsPanel");
  const commentedPostsList = document.getElementById("commentedPostsList");
  const adminToolsPanel = document.getElementById("adminToolsPanel");
  const grantExpertBtn = document.getElementById("grantExpertBtn");
  const grantSellerBtn = document.getElementById("grantSellerBtn");
  const removeRoleBtn = document.getElementById("removeRoleBtn");

  const me = await getCurrentUserProfile();

  async function refreshProfile() {
    const response = await fetch(`/api/profiles/${viewedUserId}`);
    if (!response.ok) {
      profileRoot.innerHTML = '<section class="profile-panel"><p>Unable to load profile.</p></section>';
      return;
    }

    const profile = await response.json();
    renderProfileSummary(profile);
    renderProfileActions(profile, refreshProfile);

    await fetchPosts({ userId: viewedUserId, container: profilePosts });

    const isOwnAndAuthenticated = Boolean(profile.isOwnProfile && authState.authenticated);
    const canGrant = Boolean(me && me.role === "Admin" && profile.id !== me.id);

    if (connectionRequestsPanel) connectionRequestsPanel.style.display = isOwnAndAuthenticated ? "block" : "none";
    if (connectionsPanel) connectionsPanel.style.display = isOwnAndAuthenticated ? "block" : "none";
    if (likedPostsPanel) likedPostsPanel.style.display = isOwnAndAuthenticated ? "block" : "none";
    if (commentedPostsPanel) commentedPostsPanel.style.display = isOwnAndAuthenticated ? "block" : "none";
    if (adminToolsPanel) adminToolsPanel.style.display = canGrant ? "block" : "none";

    if (isOwnAndAuthenticated) {
      await loadConnectionRequests();
      await loadConnections();
      await loadMyActivity();
    }
  }

  async function loadConnectionRequests() {
    const response = await fetch("/api/connections/requests");
    if (!response.ok) {
      if (incomingRequests) incomingRequests.innerHTML = '<div class="request-item"><p class="request-item-name">Unable to load requests.</p></div>';
      if (outgoingRequests) outgoingRequests.innerHTML = '<div class="request-item"><p class="request-item-name">Unable to load requests.</p></div>';
      return;
    }

    const data = await response.json();

    async function respondRequest(requestId, action) {
      const responseAction = await fetch(`/api/connections/requests/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const dataAction = await responseAction.json();
      if (!responseAction.ok) {
        showNotice(dataAction.message || "Failed to respond to request.", "error");
        await refreshProfile();
        return;
      }
      await refreshProfile();
    }

    async function cancelOutgoingRequest(requestId) {
      const responseCancel = await fetch(`/api/connections/requests/${requestId}/cancel`, {
        method: "POST",
      });
      const dataCancel = await responseCancel.json();
      if (!responseCancel.ok) {
        showNotice(dataCancel.message || "Failed to cancel request.", "error");
        await refreshProfile();
        return;
      }
      await refreshProfile();
    }

    renderRequestList(
      incomingRequests,
      data.incoming,
      true,
      (requestId) => respondRequest(requestId, "accept"),
      (requestId) => respondRequest(requestId, "discard")
    );

    renderOutgoingRequestList(outgoingRequests, data.outgoing, cancelOutgoingRequest);
  }

  async function loadConnections() {
    const response = await fetch("/api/connections");
    if (!response.ok) {
      if (connectionsList) connectionsList.innerHTML = '<div class="request-item"><p class="request-item-name">Unable to load connections.</p></div>';
      return;
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      if (connectionsList) {
        connectionsList.innerHTML = '<div class="request-item"><p class="request-item-name">No connections yet.</p></div>';
      }
      return;
    }

    if (!connectionsList) {
      return;
    }

    connectionsList.innerHTML = rows
      .map((row) => {
        const profileUrl = profileUrlForUser(row.userId);
        return `
          <article class="request-item">
            <div class="request-item-top">
              <div>
                <p class="request-item-name"><a class="post-profile-link" href="${profileUrl}">${escapeHtml(row.fullName)}</a></p>
                <p class="request-item-role">${escapeHtml(row.role || "User")} - ${escapeHtml(row.districtLocation || "Unknown location")}</p>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function loadMyActivity() {
    const response = await fetch("/api/me/activity");
    if (!response.ok) {
      if (likedPostsList) likedPostsList.innerHTML = '<div class="request-item"><p class="request-item-name">Unable to load liked posts.</p></div>';
      if (commentedPostsList) commentedPostsList.innerHTML = '<div class="request-item"><p class="request-item-name">Unable to load commented posts.</p></div>';
      return;
    }

    const data = await response.json();
    const likedRows = Array.isArray(data.likedPosts) ? data.likedPosts : [];
    const commentedRows = Array.isArray(data.commentedPosts) ? data.commentedPosts : [];

    if (likedPostsList) {
      if (likedRows.length === 0) {
        likedPostsList.innerHTML = '<div class="request-item"><p class="request-item-name">No liked posts yet.</p></div>';
      } else {
        likedPostsList.innerHTML = likedRows
          .map((row) => {
            const title = row.postType === "news_share" ? (row.sharedNewsTitle || "Shared news") : (row.textContent || "Untitled post");
            const shortTitle = String(title).trim().slice(0, 110);
            const targetUrl = feedPostUrl(row.postId);
            return `
              <article class="request-item">
                <p class="request-item-name"><a class="post-profile-link" href="${targetUrl}">${escapeHtml(shortTitle)}</a></p>
                <p class="activity-meta">Author: ${escapeHtml(row.authorName || "Unknown")}</p>
              </article>
            `;
          })
          .join("");
      }
    }

    if (commentedPostsList) {
      if (commentedRows.length === 0) {
        commentedPostsList.innerHTML = '<div class="request-item"><p class="request-item-name">No commented posts yet.</p></div>';
      } else {
        commentedPostsList.innerHTML = commentedRows
          .map((row) => {
            const title = row.postType === "news_share" ? (row.sharedNewsTitle || "Shared news") : (row.postText || "Untitled post");
            const shortTitle = String(title).trim().slice(0, 110);
            const targetUrl = feedPostUrl(row.postId);
            return `
              <article class="request-item">
                <p class="request-item-name"><a class="post-profile-link" href="${targetUrl}">${escapeHtml(shortTitle)}</a></p>
                <p class="activity-item-text">Your comment: ${escapeHtml(row.commentText || "")}</p>
                <p class="activity-meta">Author: ${escapeHtml(row.authorName || "Unknown")}</p>
              </article>
            `;
          })
          .join("");
      }
    }
  }

  async function grantRoleFromAdmin(desiredRole) {
    try {
      const response = await fetch(`/api/admin/users/${viewedUserId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desiredRole }),
      });
      const data = await response.json();
      if (!response.ok) {
        showNotice(data.message || "Failed to grant role.", "error");
        return;
      }

      showNotice("Role granted successfully.", "success");
      await refreshProfile();
    } catch (error) {
      console.error(error);
      showNotice("Failed to grant role.", "error");
    }
  }

  if (grantExpertBtn) {
    grantExpertBtn.addEventListener("click", () => grantRoleFromAdmin("expert"));
  }

  if (grantSellerBtn) {
    grantSellerBtn.addEventListener("click", () => grantRoleFromAdmin("seller"));
  }

  if (removeRoleBtn) {
    removeRoleBtn.addEventListener("click", () => grantRoleFromAdmin("farmer"));
  }

  await refreshProfile();
}

// ============================================
// SETTINGS PAGES
// ============================================
async function initSettingsHomePage() {
  const settingsHome = document.getElementById("settingsHomePage");
  if (!settingsHome) {
    return;
  }

  await getAuthState();
  if (!authState.authenticated) {
    settingsHome.innerHTML = '<section class="profile-panel"><p>Please login to access settings.</p><a class="action-btn" href="login.html">Login</a></section>';
  }
}

async function initChangePasswordPage() {
  const changePasswordPage = document.getElementById("changePasswordPage");
  if (!changePasswordPage) {
    return;
  }

  await getAuthState();
  if (!authState.authenticated) {
    changePasswordPage.innerHTML = '<section class="profile-panel"><p>Please login to change password.</p><a class="action-btn" href="login.html">Login</a></section>';
    return;
  }

  const changePasswordForm = document.getElementById("changePasswordForm");
  if (!changePasswordForm) {
    return;
  }

  changePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const currentPasswordInput = document.getElementById("currentPassword");
    const newPasswordInput = document.getElementById("newPassword");

    const currentPassword = currentPasswordInput ? currentPasswordInput.value : "";
    const newPassword = newPasswordInput ? newPasswordInput.value : "";

    if (!currentPassword || !newPassword) {
      showNotice("Please fill in both password fields.", "error");
      return;
    }

    try {
      const response = await fetch("/api/settings/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        showNotice(data.message || "Failed to change password.", "error");
        return;
      }

      showNotice("Password changed successfully.", "success");
      changePasswordForm.reset();
    } catch (error) {
      console.error(error);
      showNotice("Failed to change password.", "error");
    }
  });
}

async function initRoleRequestPage() {
  const roleRequestPage = document.getElementById("roleRequestPage");
  if (!roleRequestPage) {
    return;
  }

  await getAuthState();
  if (!authState.authenticated) {
    roleRequestPage.innerHTML = '<section class="profile-panel"><p>Please login to apply for a role.</p><a class="action-btn" href="login.html">Login</a></section>';
    return;
  }

  const roleRequestStatus = document.getElementById("roleRequestStatus");
  const roleRequestForm = document.getElementById("roleRequestForm");

  async function loadRoleRequestStatus() {
    if (!roleRequestStatus) {
      return;
    }

    try {
      const response = await fetch("/api/settings/role-request");
      if (!response.ok) {
        roleRequestStatus.textContent = "Unable to load role request status.";
        return;
      }

      const data = await response.json();
      const latest = data.latestRequest;
      if (!latest) {
        roleRequestStatus.textContent = "No role request submitted yet.";
        return;
      }

      const roleLabel = formatRoleLabel(latest.desiredRole);
      roleRequestStatus.textContent = `Latest request: ${roleLabel} (${latest.status})`;
    } catch (error) {
      console.error(error);
      roleRequestStatus.textContent = "Unable to load role request status.";
    }
  }

  if (roleRequestForm) {
    roleRequestForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const roleSelect = document.getElementById("desiredRole");
      const desiredRole = roleSelect ? roleSelect.value : "";

      if (!desiredRole) {
        showNotice("Please select a role.", "error");
        return;
      }

      try {
        const response = await fetch("/api/settings/role-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ desiredRole }),
        });
        const data = await response.json();

        if (!response.ok) {
          showNotice(data.message || "Failed to submit role request.", "error");
          return;
        }

        showNotice("Role request submitted to admin.", "success");
        await loadRoleRequestStatus();
      } catch (error) {
        console.error(error);
        showNotice("Failed to submit role request.", "error");
      }
    });
  }

  await loadRoleRequestStatus();
}

initFeedPage();
initMarketplacePage();
initProfilePage();
initSettingsHomePage();
initChangePasswordPage();
initRoleRequestPage();

