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
    guestModeMsg: "You're browsing as a guest.",
    loginToReact: "Login to post and react",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
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

async function copyTextToClipboard(text) {
  const value = String(text || "").trim();
  if (!value) {
    return false;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (err) {
      console.warn("navigator.clipboard.writeText failed", err);
    }
  }

  try {
    const tempInput = document.createElement("textarea");
    tempInput.value = value;
    tempInput.setAttribute("readonly", "true");
    tempInput.style.position = "fixed";
    tempInput.style.opacity = "0";
    document.body.appendChild(tempInput);
    tempInput.select();
    tempInput.setSelectionRange(0, tempInput.value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(tempInput);
    return copied;
  } catch (err) {
    console.warn("Fallback copy failed", err);
    return false;
  }
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
        const sourceLine = `${newsCategory} • ${newsSource}`;

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
      const isOwnPost = currentUserProfile && currentUserProfile.id === post.userId;
      const menuBtn = isOwnPost ? `
        <div style="position: relative;">
          <button type="button" class="post-menu-btn js-post-menu-btn" data-post-id="${safePostId}" title="Post options" aria-label="Post options">
            <i class="fa-solid fa-ellipsis"></i>
          </button>
          <div class="post-menu-dropdown js-post-menu-dropdown" data-post-id="${safePostId}">
            <button type="button" class="post-menu-item js-edit-post" data-post-id="${safePostId}"><i class="fa-solid fa-pencil"></i> Edit</button>
            <button type="button" class="post-menu-item delete js-delete-post" data-post-id="${safePostId}"><i class="fa-solid fa-trash"></i> Delete</button>
          </div>
        </div>
      ` : '';

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
          ${menuBtn}
        </header>
        ${postBody}
        <footer class="post-actions" aria-label="Post actions">
          <button type="button" class="js-like-btn ${post.likedByCurrentUser ? "liked" : ""}" data-post-id="${safePostId}"><i class="fa-regular fa-heart"></i> <span>${dictionary.en.like} (${Number(post.likesCount) || 0})</span></button>
          <button type="button" class="js-comment-btn" data-post-id="${safePostId}"><i class="fa-regular fa-comment"></i> <span>${dictionary.en.comment} (${Number(post.commentsCount) || 0})</span></button>
          <button type="button" class="js-share-btn" data-post-id="${safePostId}"><i class="fa-solid fa-share-nodes"></i> <span>${dictionary.en.share}</span></button>
          
          ${canAdminModerate ? `<button type="button" class="js-admin-delete-post" data-post-id="${safePostId}"><i class="fa-solid fa-trash"></i> <span>Delete</span></button>` : ""}
        </footer>
        <section class="post-comment-panel" data-post-id="${safePostId}" hidden>
          <div class="post-comments-list" data-post-id="${safePostId}">
          </div>
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

function renderComments(comments, listContainer, postId = null) {
  if (!listContainer) {
    return;
  }

  if (!Array.isArray(comments) || comments.length === 0) {
    listContainer.innerHTML = '';
    return;
  }

  listContainer.innerHTML = comments
    .map((comment) => {
      const commenterName = escapeHtml(comment.userName || `User #${comment.userId}`);
      const commenterInitials = escapeHtml(getAvatarInitials(commenterName));
      const commentText = escapeHtml(comment.textContent || "");
      const createdText = formatRelativeTime(comment.createdAt);
      const commentId = Number(comment.id) || 0;
      const isOwnComment = currentUserProfile && currentUserProfile.id === comment.userId;
      
      const menuBtn = isOwnComment ? `
        <div style="position: relative;">
          <button type="button" class="comment-menu-btn js-comment-menu-btn" data-post-id="${postId}" data-comment-id="${commentId}" title="Comment options" aria-label="Comment options">
            <i class="fa-solid fa-ellipsis"></i>
          </button>
          <div class="comment-menu-dropdown js-comment-menu-dropdown" data-post-id="${postId}" data-comment-id="${commentId}">
            <button type="button" class="comment-menu-item js-edit-comment" data-post-id="${postId}" data-comment-id="${commentId}"><i class="fa-solid fa-pencil"></i> Edit</button>
            <button type="button" class="comment-menu-item delete js-delete-comment" data-post-id="${postId}" data-comment-id="${commentId}"><i class="fa-solid fa-trash"></i> Delete</button>
          </div>
        </div>
      ` : '';

      return `
        <article class="post-comment-item" data-comment-id="${commentId}" data-post-id="${postId}">
          <div class="post-comment-avatar">${commenterInitials}</div>
          <div class="post-comment-body">
            <div class="comment-meta-wrapper">
              <p class="post-comment-meta"><strong>${commenterName}</strong> • ${createdText}</p>
              ${menuBtn}
            </div>
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
  return `৳ ${safePrice}${unit}`;
}

function getMarketplaceImageUrl(imagePath) {
  const safePath = String(imagePath || "").trim();
  if (!safePath) {
    return "";
  }

  if (/^https?:\/\//i.test(safePath) || safePath.startsWith("/")) {
    return safePath;
  }

  return `/${safePath.replace(/^\/+/, "")}`;
}

// Helper: load reviews for a seller and render into container (global)
async function loadSellerReviews(sellerId, container) {
  if (!container) return;
  container.innerHTML = 'Loading reviews...';
  try {
    const resp = await fetch(`/api/sellers/${sellerId}/reviews`);
    if (!resp.ok) throw new Error('Failed');
    const rows = await resp.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      container.innerHTML = '<div class="request-item"><p class="request-item-name">No reviews yet.</p></div>';
      return;
    }

    container.innerHTML = rows
      .map((r) => `
        <div class="request-item">
          <p class="request-item-name"><strong>${escapeHtml(r.reviewerName || 'Anonymous')}</strong> • ${r.rating}/5</p>
          <p class="activity-item-text">${escapeHtml(r.comment || '')}</p>
          <p class="activity-meta">${formatRelativeTime(r.createdAt)}</p>
        </div>
      `)
      .join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="request-item"><p class="request-item-name">Unable to load reviews.</p></div>';
  }
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
      const description = escapeHtml(ad.description || "No description provided.");
      const quantity = Number.isInteger(Number(ad.quantity)) && Number(ad.quantity) > 0 ? Number(ad.quantity) : null;
      const unitLabel = ad.unit ? escapeHtml(ad.unit) : "";
      const locationLabel = escapeHtml(ad.location || "Unknown location");
      const verifiedBadge = ad.isVerifiedSeller
        ? '<span class="verified-badge"><i class="fa-solid fa-circle-check"></i> Verified</span>'
        : "";
      const sellerProfileUrl = profileUrlForUser(ad.sellerId);
      const imageUrl = getMarketplaceImageUrl(ad.imagePath);
      const mediaMarkup = imageUrl
        ? `<img class="market-image-img" src="${escapeHtml(imageUrl)}" alt="${productTitle}" loading="lazy" />`
        : `<div class="market-image-fallback"><i class="fa-solid ${getMarketplaceIconClass(ad)}"></i><span>Product Image</span></div>`;

      return `
      <article class="market-card" data-market-id="${Number(ad.id) || 0}" tabindex="0" role="button" aria-expanded="false">
        <div class="market-image">
          ${mediaMarkup}
          <span class="market-image-badge">${escapeHtml(ad.category || "Other")}</span>
        </div>
        <div class="market-body">
          <p class="market-price">${formatPrice(ad)}</p>
          <h2 class="market-title">${productTitle}</h2>
          <p class="market-seller">
            <a class="post-profile-link" href="${sellerProfileUrl}">${sellerName}</a>
            ${verifiedBadge}
          </p>
          <p class="market-preview">${description}</p>
          <div class="market-meta-row">
            <span class="market-meta-chip">${locationLabel}</span>
            ${quantity ? `<span class="market-meta-chip">${quantity} ${unitLabel || "units"}</span>` : ""}
            <span class="market-meta-chip">${escapeHtml(ad.category || "Other")}</span>
          </div>
          <div class="market-actions" aria-label="Marketplace item actions">
            <a class="call-seller-btn market-action-link" href="tel:${sellerMobile}">Call Seller</a>
            <a class="call-seller-btn market-action-link secondary" href="${sellerProfileUrl}">View Seller</a>
            ${Number(ad.sellerId) === Number(authState.userId) ? '<button class="market-edit-btn market-action-link" type="button">Edit</button>' : ''}
          </div>
          <div class="market-details">
            <p class="market-detail-line"><strong>Seller:</strong> ${sellerName}</p>
            <p class="market-detail-line"><strong>Mobile:</strong> ${sellerMobile}</p>
            <p class="market-detail-line"><strong>Location:</strong> ${locationLabel}</p>
            <p class="market-detail-line"><strong>Category:</strong> ${escapeHtml(ad.category || "Other")}</p>
          </div>
          <button class="market-expand-btn" type="button">View details</button>
        </div>
      </article>`;
    })
    .join("");

  const marketCards = marketplaceGrid.querySelectorAll(".market-card");
  marketCards.forEach((card) => {
    const details = card.querySelector(".market-details");
    const expandBtn = card.querySelector(".market-expand-btn");

    const toggleDetails = () => {
      if (!details) {
        return;
      }

      const isOpen = card.classList.toggle("is-expanded");
      details.hidden = !isOpen;
      card.setAttribute("aria-expanded", String(isOpen));
      if (expandBtn) {
        expandBtn.textContent = isOpen ? "Hide details" : "View details";
      }
    };

    card.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) {
        return;
      }
      toggleDetails();
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleDetails();
      }
    });

    if (expandBtn) {
      expandBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleDetails();
      });
    }
  });

  

  // Wire up dynamically created edit and review buttons
  marketCards.forEach((card) => {
    const details = card.querySelector('.market-details');
    const editBtn = card.querySelector('.market-edit-btn');

    // When details become visible, load reviews
    const observer = new MutationObserver(() => {
      if (details && !details.hidden) {
        const reviewsList = details.querySelector('.reviews-list');
        const sid = reviewsList ? Number(reviewsList.dataset.sellerId) : null;
        if (sid && reviewsList) loadSellerReviews(sid, reviewsList);
      }
    });
    if (details) {
      observer.observe(details, { attributes: true, attributeFilter: ['hidden'] });
    }

    if (editBtn) {
      editBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const marketId = Number(card.getAttribute('data-market-id')) || 0;
        if (!marketId) return;

        // Build simple inline edit form inside details
        const existingTitle = card.querySelector('.market-title') ? card.querySelector('.market-title').textContent.trim() : '';
        const existingPrice = card.querySelector('.market-price') ? card.querySelector('.market-price').textContent.replace(/[^0-9.]/g, '') : '';
        const existingPreview = card.querySelector('.market-preview') ? card.querySelector('.market-preview').textContent.trim() : '';

        const formHtml = `
          <div class="market-edit-form">
            <label>Title: <input class="edit-title" value="${escapeHtml(existingTitle)}" /></label>
            <label>Price: <input class="edit-price" value="${escapeHtml(existingPrice)}" /></label>
            <label>Description: <textarea class="edit-desc">${escapeHtml(existingPreview)}</textarea></label>
            <label>Image: <input type="file" class="edit-image" accept="image/*" /></label>
            <div style="margin-top:0.5rem;"><button class="save-edit-btn">Save</button> <button class="cancel-edit-btn">Cancel</button></div>
          </div>`;

        if (!details) return;
        let editWrap = details.querySelector('.market-edit-form');
        if (!editWrap) {
          details.insertAdjacentHTML('beforeend', formHtml);
          editWrap = details.querySelector('.market-edit-form');
        }

        const saveBtn = editWrap.querySelector('.save-edit-btn');
        const cancelBtn = editWrap.querySelector('.cancel-edit-btn');
        const titleInput = editWrap.querySelector('.edit-title');
        const priceInput = editWrap.querySelector('.edit-price');
        const descInput = editWrap.querySelector('.edit-desc');
        const imageInput = editWrap.querySelector('.edit-image');

        cancelBtn.addEventListener('click', (e) => {
          e.preventDefault();
          editWrap.remove();
        });

        saveBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.append('productTitle', titleInput.value || '');
          fd.append('price', priceInput.value || '0');
          fd.append('description', descInput.value || '');
          if (imageInput.files && imageInput.files[0]) fd.append('image', imageInput.files[0]);

          try {
            const resp = await fetch(`/api/marketplace/${marketId}`, { method: 'PUT', body: fd });
            const data = await resp.json();
            if (!resp.ok) {
              showNotice(data.message || 'Failed to update ad', 'error');
              return;
            }
            showNotice('Ad updated', 'success');
            // Refresh the marketplace grid by re-fetching ads (if a load function exists globally)
            if (typeof window.reloadMarketplace === 'function') {
              window.reloadMarketplace();
            }
            // remove edit form
            editWrap.remove();
          } catch (err) {
            console.error(err);
            showNotice('Failed to update ad', 'error');
          }
        });
      });
    }

    
  });
}

// ============================================
// FEED PAGE
// ============================================
function initFeedPage() {
  const feedList = document.querySelector(".feed-list");
  const featuredMarketplaceList = document.getElementById("featuredMarketplaceList");
  const homeConnectionsList = document.getElementById("homeConnectionsList");
  const postBtn = document.querySelector(".post-btn");
  const postTextInput = document.getElementById("postText");
  const postPhotoInput = document.getElementById("postPhoto");
  const isHelpRequestInput = document.getElementById("isHelpRequest");
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

  function renderMarketplaceRailItems(rows) {
    if (!featuredMarketplaceList) {
      return;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      featuredMarketplaceList.innerHTML = '<p class="rail-empty">No marketplace items yet.</p>';
      return;
    }

    featuredMarketplaceList.innerHTML = rows
      .map((ad) => {
        const sellerName = escapeHtml(ad.sellerName || "Unknown seller");
        const productTitle = escapeHtml(ad.productTitle || "Untitled product");
        const priceText = escapeHtml(formatPrice(ad));
        const sellerProfileUrl = profileUrlForUser(ad.sellerId);
        return `
          <article class="rail-item">
            <h3 class="rail-item-title">${productTitle}</h3>
            <p class="rail-item-meta">${priceText} • ${sellerName}</p>
            <a class="rail-item-link" href="marketplace.html">View in marketplace</a>
            <a class="rail-item-link" href="${sellerProfileUrl}">Seller profile</a>
          </article>
        `;
      })
      .join("");
  }

  function renderConnectionsRailItems(rows) {
    if (!homeConnectionsList) {
      return;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      homeConnectionsList.innerHTML = '<p class="rail-empty">No connections yet.</p>';
      return;
    }

    homeConnectionsList.innerHTML = rows
      .slice(0, 12)
      .map((row) => {
        const fullName = escapeHtml(row.fullName || "Unknown user");
        const roleLabel = escapeHtml(formatRoleLabel(row.role));
        const location = escapeHtml(row.districtLocation || "Unknown location");
        return `
          <article class="rail-item">
            <h3 class="rail-item-title">${fullName}</h3>
            <p class="rail-item-meta">${roleLabel} • ${location}</p>
            <a class="rail-item-link" href="${profileUrlForUser(row.userId)}">Open profile</a>
          </article>
        `;
      })
      .join("");
  }

  async function loadHomeRightRail() {
    if (featuredMarketplaceList) {
      featuredMarketplaceList.innerHTML = '<p class="rail-empty">Loading marketplace picks...</p>';
    }

    if (homeConnectionsList) {
      homeConnectionsList.innerHTML = '<p class="rail-empty">Loading connections...</p>';
    }

    try {
      const marketplaceResponse = await fetch("/api/marketplace");
      if (marketplaceResponse.ok) {
        const marketplaceRows = await marketplaceResponse.json();
        const items = Array.isArray(marketplaceRows) ? [...marketplaceRows] : [];
        items.sort(() => Math.random() - 0.5);
        renderMarketplaceRailItems(items.slice(0, 5));
      } else {
        renderMarketplaceRailItems([]);
      }
    } catch (error) {
      console.error("Failed to load marketplace rail:", error);
      renderMarketplaceRailItems([]);
    }

    const state = await getAuthState();
    if (!state.authenticated) {
      if (homeConnectionsList) {
        homeConnectionsList.innerHTML = '<p class="rail-empty">Login to view your connections.</p>';
      }
      return;
    }

    try {
      const connectionsResponse = await fetch("/api/connections");
      if (!connectionsResponse.ok) {
        homeConnectionsList.innerHTML = '<p class="rail-empty">Unable to load connections.</p>';
        return;
      }

      const connectionsRows = await connectionsResponse.json();
      renderConnectionsRailItems(connectionsRows);
    } catch (error) {
      console.error("Failed to load home connections:", error);
      if (homeConnectionsList) {
        homeConnectionsList.innerHTML = '<p class="rail-empty">Unable to load connections.</p>';
      }
    }
  }

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

      renderComments(data, commentsList, postId);
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

  const editModal = document.getElementById("editModal");
  const editModalClose = document.getElementById("editModalClose");
  const editModalCancel = document.getElementById("editModalCancel");
  const editModalSave = document.getElementById("editModalSave");
  const editModalText = document.getElementById("editModalText");
  const deleteModal = document.getElementById("deleteModal");
  const deleteModalCancel = document.getElementById("deleteModalCancel");
  const deleteModalConfirm = document.getElementById("deleteModalConfirm");

  function closeAllMenus() {
    feedList.querySelectorAll(".post-menu-dropdown.show").forEach((dropdown) => dropdown.classList.remove("show"));
    feedList.querySelectorAll(".comment-menu-dropdown.show").forEach((dropdown) => dropdown.classList.remove("show"));
  }

  function openEditModal({ mode, postId, commentId = null, text }) {
    if (!editModal || !editModalText) {
      return;
    }

    editModal.dataset.mode = mode;
    editModal.dataset.postId = String(postId);
    if (commentId !== null) {
      editModal.dataset.commentId = String(commentId);
    } else {
      delete editModal.dataset.commentId;
    }

    editModalText.value = String(text || "");
    editModal.style.display = "flex";
    closeAllMenus();
  }

  function openDeleteModal({ mode, postId, commentId = null }) {
    if (!deleteModal) {
      return;
    }

    const deleteModalTitle = document.getElementById("deleteModalTitle");
    const deleteModalMessage = document.getElementById("deleteModalMessage");
    if (deleteModalTitle && deleteModalMessage) {
      deleteModalTitle.textContent = mode === "comment" ? "Delete Comment" : "Delete Post";
      deleteModalMessage.textContent = mode === "comment"
        ? "Are you sure you want to delete this comment? This action cannot be undone."
        : "Are you sure you want to delete this post? This action cannot be undone.";
    }

    deleteModal.dataset.mode = mode;
    deleteModal.dataset.postId = String(postId);
    if (commentId !== null) {
      deleteModal.dataset.commentId = String(commentId);
    } else {
      delete deleteModal.dataset.commentId;
    }

    deleteModal.style.display = "flex";
    closeAllMenus();
  }

  if (editModalClose) {
    editModalClose.addEventListener("click", () => {
      editModal.style.display = "none";
    });
  }

  if (editModalCancel) {
    editModalCancel.addEventListener("click", () => {
      editModal.style.display = "none";
    });
  }

  if (editModalSave) {
    editModalSave.addEventListener("click", async () => {
      const mode = editModal ? editModal.dataset.mode : "";
      const postId = Number.parseInt(editModal ? editModal.dataset.postId : "", 10);
      const commentId = Number.parseInt(editModal ? editModal.dataset.commentId : "", 10);
      const textContent = String(editModalText ? editModalText.value : "").trim();

      if (!textContent) {
        showNotice("Content cannot be empty.", "error");
        return;
      }

      try {
        if (mode === "post") {
          if (!Number.isInteger(postId) || postId <= 0) return;
          const response = await fetch(`/api/posts/${postId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ textContent }),
          });
          const data = await response.json();
          if (!response.ok) {
            showNotice(data.message || "Failed to update post.", "error");
            return;
          }
          editModal.style.display = "none";
          await fetchPosts({ container: feedList, targetPostId: postId });
        } else if (mode === "comment") {
          if (!Number.isInteger(postId) || postId <= 0 || !Number.isInteger(commentId) || commentId <= 0) return;
          const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ textContent }),
          });
          const data = await response.json();
          if (!response.ok) {
            showNotice(data.message || "Failed to update comment.", "error");
            return;
          }
          editModal.style.display = "none";
          await loadPostComments(postId, { forceRefresh: true });
        }
      } catch (error) {
        console.error(error);
        showNotice("Failed to save changes.", "error");
      }
    });
  }

  if (deleteModalCancel) {
    deleteModalCancel.addEventListener("click", () => {
      deleteModal.style.display = "none";
    });
  }

  if (deleteModalConfirm) {
    deleteModalConfirm.addEventListener("click", async () => {
      const mode = deleteModal ? deleteModal.dataset.mode : "";
      const postId = Number.parseInt(deleteModal ? deleteModal.dataset.postId : "", 10);
      const commentId = Number.parseInt(deleteModal ? deleteModal.dataset.commentId : "", 10);

      try {
        if (mode === "post") {
          if (!Number.isInteger(postId) || postId <= 0) return;
          const response = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
          const data = await response.json();
          if (!response.ok) {
            showNotice(data.message || "Failed to delete post.", "error");
            return;
          }
          deleteModal.style.display = "none";
          await fetchPosts({ container: feedList });
        } else if (mode === "comment") {
          if (!Number.isInteger(postId) || postId <= 0 || !Number.isInteger(commentId) || commentId <= 0) return;
          const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
          const data = await response.json();
          if (!response.ok) {
            showNotice(data.message || "Failed to delete comment.", "error");
            return;
          }
          deleteModal.style.display = "none";
          await loadPostComments(postId, { forceRefresh: true });
        }
      } catch (error) {
        console.error(error);
        showNotice("Failed to delete item.", "error");
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".post-menu-btn") && !event.target.closest(".post-menu-dropdown") && !event.target.closest(".comment-menu-btn") && !event.target.closest(".comment-menu-dropdown")) {
      closeAllMenus();
    }

    if (event.target === editModal) {
      editModal.style.display = "none";
    }

    if (event.target === deleteModal) {
      deleteModal.style.display = "none";
    }
  });

  function updateComposerAvatar(profile) {
    if (!composerAvatar) {
      return;
    }

    const profileName = profile && profile.full_name ? profile.full_name : "Anonymous User";
    composerAvatar.textContent = getAvatarInitials(profileName);
  }

  getCurrentUserProfile().then((me) => {
    if (me && me.role === "Admin") {
      window.location.href = "/admin.html";
      return;
    }

    updateComposerAvatar(me);

    fetchPosts({
      container: feedList,
      targetPostId: Number.isInteger(targetPostIdParam) && targetPostIdParam > 0 ? targetPostIdParam : null,
    });
  });

  loadHomeRightRail();

  function clearImagePreview({ clearInput = false } = {}) {
    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
      currentPreviewUrl = null;
    }

    if (postImagePreview) {
      postImagePreview.src = "";
    }

    if (postImagePreviewWrap) {
      postImagePreviewWrap.hidden = true;
    }

    if (clearInput && postPhotoInput) {
      postPhotoInput.value = "";
    }

    composerSelectedImageFile = null;
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
    const isHelpRequest = Boolean(isHelpRequestInput && isHelpRequestInput.checked);

    if (!textContent && !selectedImageFile) {
      if (postTextInput) {
        postTextInput.focus();
      }
      return false;
    }

    const formData = new FormData();
    formData.append("textContent", textContent);
    formData.append("isHelpRequest", isHelpRequest ? "true" : "false");
    if (selectedImageFile) {
      formData.append("image", selectedImageFile);
    }

    let response;
    try {
      response = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      console.error(error);
      showNotice("Network error while publishing. Please try again.", "error");
      return false;
    }

    if (!response.ok) {
      let serverMessage = "Could not publish post.";
      try {
        const data = await response.json();
        if (data && data.message) {
          serverMessage = data.message;
        }
      } catch (error) {
        console.error(error);
      }
      showNotice(serverMessage, "error");
      return false;
    }

    if (postTextInput) {
      postTextInput.value = "";
    }
    if (isHelpRequestInput) {
      isHelpRequestInput.checked = false;
    }
    clearImagePreview({ clearInput: true });
    await fetchPosts({ container: feedList });
    return true;
  }

  feedList.addEventListener("click", async (event) => {
    const postMenuBtn = event.target.closest(".js-post-menu-btn");
    if (postMenuBtn) {
      const postId = Number.parseInt(postMenuBtn.dataset.postId, 10);
      if (Number.isInteger(postId) && postId > 0) {
        const dropdown = feedList.querySelector(`.js-post-menu-dropdown[data-post-id="${postId}"]`);
        if (dropdown) {
          dropdown.classList.toggle("show");
        }
      }
      event.stopPropagation();
      return;
    }

    const postEditBtn = event.target.closest(".js-edit-post");
    if (postEditBtn) {
      const postId = Number.parseInt(postEditBtn.dataset.postId, 10);
      const postCard = feedList.querySelector(`#post-${postId}`);
      const postText = postCard ? postCard.querySelector(".post-text") : null;
      if (postCard && postText) {
        openEditModal({ mode: "post", postId, text: postText.textContent });
      }
      event.stopPropagation();
      return;
    }

    const postDeleteBtn = event.target.closest(".js-delete-post");
    if (postDeleteBtn) {
      const postId = Number.parseInt(postDeleteBtn.dataset.postId, 10);
      if (Number.isInteger(postId) && postId > 0) {
        openDeleteModal({ mode: "post", postId });
      }
      event.stopPropagation();
      return;
    }

    const commentMenuBtn = event.target.closest(".js-comment-menu-btn");
    if (commentMenuBtn) {
      const postId = Number.parseInt(commentMenuBtn.dataset.postId, 10);
      const commentId = Number.parseInt(commentMenuBtn.dataset.commentId, 10);
      if (Number.isInteger(postId) && postId > 0 && Number.isInteger(commentId) && commentId > 0) {
        const dropdown = feedList.querySelector(`.js-comment-menu-dropdown[data-post-id="${postId}"][data-comment-id="${commentId}"]`);
        if (dropdown) {
          dropdown.classList.toggle("show");
        }
      }
      event.stopPropagation();
      return;
    }

    const commentEditBtn = event.target.closest(".js-edit-comment");
    if (commentEditBtn) {
      const postId = Number.parseInt(commentEditBtn.dataset.postId, 10);
      const commentId = Number.parseInt(commentEditBtn.dataset.commentId, 10);
      const commentItem = feedList.querySelector(`.post-comment-item[data-post-id="${postId}"][data-comment-id="${commentId}"]`);
      const commentText = commentItem ? commentItem.querySelector(".post-comment-text") : null;
      if (commentItem && commentText) {
        openEditModal({ mode: "comment", postId, commentId, text: commentText.textContent });
      }
      event.stopPropagation();
      return;
    }

    const commentDeleteBtn = event.target.closest(".js-delete-comment");
    if (commentDeleteBtn) {
      const postId = Number.parseInt(commentDeleteBtn.dataset.postId, 10);
      const commentId = Number.parseInt(commentDeleteBtn.dataset.commentId, 10);
      if (Number.isInteger(postId) && postId > 0 && Number.isInteger(commentId) && commentId > 0) {
        openDeleteModal({ mode: "comment", postId, commentId });
      }
      event.stopPropagation();
      return;
    }

    const shareButton = event.target.closest('.js-share-btn');
    if (shareButton) {
      const postId = Number.parseInt(shareButton.dataset.postId, 10);
      if (!Number.isInteger(postId) || postId <= 0) return;
      const postUrl = window.location.origin + '/' + feedPostUrl(postId);
      try {
        if (navigator.share) {
          await navigator.share({ title: 'Khet-Khamar post', url: postUrl });
          showNotice('Shared via system share', 'success');
        } else {
          const copied = await copyTextToClipboard(postUrl);
          if (copied) {
            showNotice('Post link copied to clipboard', 'success');
          } else {
            window.prompt('Copy this link', postUrl);
            showNotice('Copy the link to share this post.', 'info');
          }
        }
      } catch (err) {
        console.error('Share failed', err);
        const copied = await copyTextToClipboard(postUrl);
        if (copied) {
          showNotice('Post link copied to clipboard', 'success');
        } else {
          window.prompt('Copy this link', postUrl);
          showNotice('Copy the link to share this post.', 'info');
        }
      }
      return;
    }
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

  // Notification center wiring (header notification UI)
  const notificationToggle = document.getElementById('notificationToggle');
  const notificationPanel = document.getElementById('notificationPanel');
  const notificationBadge = document.getElementById('notificationBadge');
  const notificationList = document.getElementById('notificationList');
  const readAllBtn = document.getElementById('readAllBtn');

  async function loadNotifications() {
    const state = await getAuthState();
    if (!state.authenticated) {
      if (notificationToggle) notificationToggle.style.display = 'none';
      if (notificationPanel) notificationPanel.style.display = 'none';
      return;
    }

    try {
      const resp = await fetch('/api/notifications');
      if (!resp.ok) throw new Error('Failed');
      const data = await resp.json();
      const unread = Number(data.unreadCount || 0);
      if (notificationBadge) {
        notificationBadge.style.display = unread > 0 ? 'inline-block' : 'none';
        notificationBadge.textContent = unread > 9 ? '9+' : String(unread);
      }
      if (notificationToggle) {
        if (unread > 0) {
          notificationToggle.classList.add('has-unread');
        } else {
          notificationToggle.classList.remove('has-unread');
        }
      }

      if (!notificationList) return;
      const rows = Array.isArray(data.notifications) ? data.notifications : [];

      const describeNotification = (notification) => {
        const actorName = escapeHtml(notification.actorName || 'Someone');
        switch (String(notification.notificationType || '').trim()) {
          case 'post_like':
          case 'like':
            return `${actorName} liked your post`;
          case 'post_comment':
          case 'comment':
            return `${actorName} commented on your post`;
          case 'help_request':
            return `${actorName} is asking for help`;
          case 'connection_request':
            return `${actorName} sent you a connection request`;
          case 'connection_accepted':
            return `${actorName} accepted your connection request`;
          case 'new_follower':
            return `${actorName} started following you`;
          case 'seller_review':
            return `${actorName} reviewed your seller profile`;
          default:
            return `${actorName} sent you a notification`;
        }
      };

      if (rows.length === 0) {
        notificationList.innerHTML = '<div class="request-item"><p class="request-item-name">No notifications</p></div>';
        return;
      }

      notificationList.innerHTML = rows
        .map((n) => `
          <article class="notification-item" data-notification-id="${n.id}" data-post-id="${n.postId || ''}">
            <p class="request-item-name">${describeNotification(n)}</p>
            ${n.postContent ? `<p class="activity-item-text">${escapeHtml(n.postContent || '')}</p>` : ''}
            <p class="activity-meta">${formatRelativeTime(n.createdAt)}</p>
            <div class="notification-actions">
              ${n.postId ? `<a class="action-btn secondary" href="${feedPostUrl(n.postId)}">View post</a>` : ''}
              ${n.actorId ? `<a class="action-btn secondary" href="${profileUrlForUser(n.actorId)}">View profile</a>` : ''}
              <button class="action-btn mark-read-btn" data-notification-id="${n.id}">Mark read</button>
            </div>
          </article>
        `).join('');
    } catch (err) {
      console.error('Load notifications failed', err);
      if (notificationList) notificationList.innerHTML = '<div class="request-item"><p class="request-item-name">Unable to load notifications.</p></div>';
    }
  }

  if (notificationToggle) {
    notificationToggle.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!notificationPanel) return;
      const isOpen = notificationPanel.style.display === 'block';
      if (isOpen) {
        notificationPanel.style.display = 'none';
      } else {
        notificationPanel.style.display = 'block';
        await loadNotifications();
      }
    });
  }

  document.addEventListener('click', (event) => {
    if (!notificationPanel || !notificationToggle) return;
    const clickedInside = notificationPanel.contains(event.target) || notificationToggle.contains(event.target);
    if (!clickedInside) {
      notificationPanel.style.display = 'none';
    }
  });

  if (readAllBtn) {
    readAllBtn.addEventListener('click', async () => {
      try {
        const resp = await fetch('/api/notifications/read-all', { method: 'POST' });
        const data = await resp.json();
        if (!resp.ok) {
          showNotice(data.message || 'Failed to mark notifications', 'error');
          return;
        }
        if (notificationBadge) notificationBadge.style.display = 'none';
        await loadNotifications();
      } catch (err) {
        console.error(err);
        showNotice('Failed to update notifications', 'error');
      }
    });
  }

  // Handle mark-read clicks inside notification list
  if (notificationList) {
    notificationList.addEventListener('click', async (ev) => {
      const markReadBtn = ev.target.closest('.mark-read-btn');
      const item = ev.target.closest('.notification-item');

      if (markReadBtn) {
        const nid = Number(markReadBtn.dataset.notificationId);
        if (!nid) return;
        try {
          const resp = await fetch(`/api/notifications/${nid}/read`, { method: 'POST' });
          const data = await resp.json();
          if (!resp.ok) {
            showNotice(data.message || 'Failed to mark read', 'error');
            return;
          }
          await loadNotifications();
        } catch (err) {
          console.error(err);
          showNotice('Failed to update notification', 'error');
        }
        return;
      }

      if (!item || ev.target.closest('a, button')) {
        return;
      }

      const notificationId = Number(item.dataset.notificationId);
      const postId = Number(item.dataset.postId);

      if (notificationId) {
        try {
          await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' });
        } catch (err) {
          console.error('Failed to mark notification read on click', err);
        }
      }

      if (Number.isInteger(postId) && postId > 0) {
        window.location.href = `/${feedPostUrl(postId)}`;
      }
    });
  }

  loadNotifications();

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
}

// ============================================
// MARKETPLACE PAGE
// ============================================
function initMarketplacePage() {
  const marketplaceGrid = document.querySelector(".market-grid");
  if (!marketplaceGrid) {
    return;
  }

  let allMarketplaceAds = [];
  const sellerPostingCard = document.getElementById("sellerPostingCard");
  const marketplaceForm = document.getElementById("marketplaceForm");
  const adTitleInput = document.getElementById("adTitle");
  const adDescriptionInput = document.getElementById("adDescription");
  const adPriceInput = document.getElementById("adPrice");
  const adQuantityInput = document.getElementById("adQuantity");
  const adUnitInput = document.getElementById("adUnit");
  const adCategoryInput = document.getElementById("adCategory");
  const adLocationInput = document.getElementById("adLocation");
  const adImageInput = document.getElementById("adImage");
  const adImagePreviewWrap = document.getElementById("adImagePreview");
  const adImagePreviewImg = document.getElementById("adImagePreviewImg");
  const removeAdImageBtn = document.getElementById("removeAdImage");
  const searchInput = document.querySelector(".market-filter-item.search-field input");
  const categorySelect = document.getElementById("categorySelect");
  const locationSelect = document.getElementById("locationSelect");
  let selectedAdImageFile = null;
  let adImagePreviewUrl = null;

  function clearAdImagePreview({ clearInput = false } = {}) {
    if (adImagePreviewUrl) {
      URL.revokeObjectURL(adImagePreviewUrl);
      adImagePreviewUrl = null;
    }

    if (adImagePreviewImg) {
      adImagePreviewImg.src = "";
    }

    if (adImagePreviewWrap) {
      adImagePreviewWrap.style.display = "none";
    }

    if (clearInput && adImageInput) {
      adImageInput.value = "";
    }

    selectedAdImageFile = null;
  }

  function setAdImageFile(file) {
    if (!file) {
      clearAdImagePreview();
      return;
    }

    if (!String(file.type || "").startsWith("image/")) {
      clearAdImagePreview({ clearInput: true });
      showNotice("Please select a valid image file.", "error");
      return;
    }

    clearAdImagePreview();
    selectedAdImageFile = file;
    adImagePreviewUrl = URL.createObjectURL(file);

    if (adImagePreviewImg) {
      adImagePreviewImg.src = adImagePreviewUrl;
    }

    if (adImagePreviewWrap) {
      adImagePreviewWrap.style.display = "block";
    }
  }

  async function submitMarketplaceAd() {
    const title = String(adTitleInput ? adTitleInput.value : "").trim();
    const description = String(adDescriptionInput ? adDescriptionInput.value : "").trim();
    const price = String(adPriceInput ? adPriceInput.value : "").trim();
    const quantity = String(adQuantityInput ? adQuantityInput.value : "").trim();
    const unit = String(adUnitInput ? adUnitInput.value : "").trim();
    const category = String(adCategoryInput ? adCategoryInput.value : "").trim();
    const location = String(adLocationInput ? adLocationInput.value : "").trim();
    const imageFile = selectedAdImageFile || (adImageInput && adImageInput.files ? adImageInput.files[0] : null);

    if (!title || !price || !category || !location) {
      showNotice("Title, price, category, and location are required.", "error");
      return false;
    }

    const formData = new FormData();
    formData.append("productTitle", title);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("category", category);
    formData.append("location", location);
    formData.append("quantity", quantity);
    formData.append("unit", unit);

    if (imageFile) {
      formData.append("image", imageFile);
    }

    const response = await fetch("/api/marketplace", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      showNotice(data.message || "Failed to post product.", "error");
      return false;
    }

    showNotice("Product posted successfully.", "success");

    if (marketplaceForm) {
      marketplaceForm.reset();
    }
    clearAdImagePreview({ clearInput: true });
    await fetchMarketplaceAds();
    return true;
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

  if (adImageInput) {
    adImageInput.addEventListener("change", () => {
      const file = adImageInput.files ? adImageInput.files[0] : null;
      setAdImageFile(file);
    });
  }

  if (removeAdImageBtn) {
    removeAdImageBtn.addEventListener("click", () => {
      clearAdImagePreview({ clearInput: true });
    });
  }

  if (marketplaceForm) {
    marketplaceForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const state = await getAuthState();
        if (!state.authenticated) {
          window.location.href = "/login.html";
          return;
        }

        const profile = await getCurrentUserProfile();
        const role = String(profile && profile.role ? profile.role : "");
        const canPost = role === "General Vendor" || role === "Verified Vendor";

        if (!canPost) {
          showNotice("Only sellers can post marketplace ads.", "error");
          return;
        }

        await submitMarketplaceAd();
      } catch (error) {
        console.error(error);
        showNotice("Failed to post product.", "error");
      }
    });
  }

  getCurrentUserProfile().then((profile) => {
    const role = String(profile && profile.role ? profile.role : "");
    const canPost = role === "General Vendor" || role === "Verified Vendor";

    if (!sellerPostingCard) {
      return;
    }

    sellerPostingCard.style.display = canPost ? "block" : "none";
  });

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
}

function renderProfileSummary(profile) {
  const profileCard = document.getElementById("profileCard");
  if (!profileCard) {
    return;
  }

  const initials = escapeHtml(getAvatarInitials(profile.fullName));
  const roleBadge = profile.role === "Verified Expert"
    ? '<span class="verified-badge"><i class="fa-solid fa-circle-check"></i> Expert</span>'
    : profile.role === "General Vendor"
      ? '<span class="seller-badge"><i class="fa-solid fa-store"></i> Seller</span>'
      : "";
  const roleLabel = escapeHtml(formatRoleLabel(profile.role));

  profileCard.innerHTML = `
    <div class="profile-card-top">
      <div class="avatar avatar-owner">${initials}</div>
      <div>
        <h2 class="profile-name">${escapeHtml(profile.fullName)}</h2>
        <p class="profile-role">${roleLabel} • ${escapeHtml(profile.districtLocation || "Unknown location")} ${roleBadge}</p>
      </div>
    </div>
    <p class="profile-bio">${escapeHtml(profile.bio || "No bio yet.")}</p>
    <div class="profile-stats">
      <a class="profile-stat profile-stat-link" href="#profilePosts"><strong>${profile.postsCount}</strong><span>Posts</span></a>
      <button class="profile-stat profile-stat-link" type="button" data-panel="connectionsPanel"><strong>${profile.connectionsCount}</strong><span>Connections</span></button>
      <button class="profile-stat profile-stat-link" type="button" data-profile-link="followers"><strong>${profile.followersCount}</strong><span>Followers</span></button>
      <button class="profile-stat profile-stat-link" type="button" data-profile-link="following"><strong>${profile.followingCount}</strong><span>Following</span></button>
    </div>
  `;

  const followersLink = profileCard.querySelector('[data-profile-link="followers"]');
  if (followersLink) {
    followersLink.addEventListener("click", () => {
      window.location.href = `connections.html?userId=${encodeURIComponent(profile.id)}&tab=followers`;
    });
  }

  const followingLink = profileCard.querySelector('[data-profile-link="following"]');
  if (followingLink) {
    followingLink.addEventListener("click", () => {
      window.location.href = `connections.html?userId=${encodeURIComponent(profile.id)}&tab=following`;
    });
  }

  // Wire up stat buttons that open profile panels (e.g., Connections)
  const panelButtons = profileCard.querySelectorAll("[data-panel]");
  panelButtons.forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      const panelId = btn.getAttribute("data-panel");
      if (!panelId) return;
      // Use the profile page's panel switching helper if available
      if (typeof window.showProfilePanel === "function") {
        window.showProfilePanel(panelId);
      } else {
        const panel = document.getElementById(panelId);
        if (panel) {
          // hide other panels and show this one
          document.querySelectorAll('.profile-panel').forEach((p) => (p.style.display = 'none'));
          panel.style.display = 'block';
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

// Expose a global helper to switch visible profile panels
window.showProfilePanel = function (panelId) {
  if (!panelId) return;
  const allowed = [
    'profilePosts',
    'connectionRequestsPanel',
    'connectionsPanel',
    'adminToolsPanel',
    'likedPostsPanel',
    'commentedPostsPanel',
    'sellerReviewsPanel',
  ];

  // If the requested panel isn't known, do nothing
  if (!allowed.includes(panelId)) return;

  // hide all profile panels
  document.querySelectorAll('.profile-panel').forEach((p) => (p.style.display = 'none'));

  const target = document.getElementById(panelId);
  if (target) {
    target.style.display = 'block';
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

function renderProfileActions(profile, refreshProfile) {
  const profileActions = document.getElementById("profileActions");
  if (!profileActions) {
    return;
  }

  profileActions.innerHTML = "";

  if (profile.isOwnProfile) {
    profileActions.innerHTML = `
      <a class="action-btn" href="settings.html">Edit Profile</a>
      <a class="action-btn secondary" href="connections.html?userId=${encodeURIComponent(profile.id)}">View Connections</a>
    `;
    // If owner is also a seller, show a quick 'View Reviews' action
    if (profile.role === 'General Vendor' || profile.role === 'Verified Vendor') {
      const viewReviewsBtn = document.createElement('a');
      viewReviewsBtn.className = 'action-btn secondary';
      viewReviewsBtn.href = '#';
      viewReviewsBtn.textContent = 'View Reviews';
      viewReviewsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.showProfilePanel('sellerReviewsPanel');
        const list = document.getElementById('sellerReviewsList');
        if (list) loadSellerReviews(profile.id, list);
      });
      profileActions.appendChild(viewReviewsBtn);
    }
    // Show logout button wrapper
    const logoutWrap = document.getElementById('profileLogoutWrap');
    const profileLogoutBtn = document.getElementById('profileLogoutBtn');
    if (logoutWrap && profileLogoutBtn) {
      logoutWrap.style.display = 'block';
      profileLogoutBtn.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/index.html';
      });
    }
    return;
  }

  if (!authState.authenticated) {
    profileActions.innerHTML = '<a class="action-btn" href="login.html">Login to connect</a>';
    return;
  }

  const relation = profile.relation || {};
  const connectionStatusLabel = relation.connectionStatus === "connected"
    ? "Connected"
    : relation.connectionStatus === "incoming_pending"
      ? "Request received"
      : relation.connectionStatus === "outgoing_pending"
        ? "Request sent"
        : "Not connected";

  const connectionBadge = document.createElement("span");
  connectionBadge.className = "profile-connection-badge";
  connectionBadge.textContent = connectionStatusLabel;
  profileActions.appendChild(connectionBadge);

  // Add Reviews button for seller profiles
  if (profile.role === 'General Vendor' || profile.role === 'Verified Vendor') {
    const reviewBtn = document.createElement('button');
    reviewBtn.className = 'action-btn secondary';
    reviewBtn.textContent = 'Reviews';
    reviewBtn.addEventListener('click', () => {
      window.showProfilePanel('sellerReviewsPanel');
      const list = document.getElementById('sellerReviewsList');
      if (list) loadSellerReviews(profile.id, list);
    });
    profileActions.appendChild(reviewBtn);
  }

  if (relation.connectionStatus === "none") {
    const connectBtn = document.createElement("button");
    connectBtn.className = "action-btn";
    connectBtn.textContent = "Connect";
    connectBtn.addEventListener("click", async () => {
      const response = await fetch("/api/connections/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: profile.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        showNotice(data.message || "Failed to send connection request.", "error");
        return;
      }

      showNotice("Connection request sent.", "success");
      await refreshProfile();
    });

    profileActions.appendChild(connectBtn);
    return;
  }

  if (relation.connectionStatus === "connected") {
    const connected = document.createElement("span");
    connected.className = "action-btn secondary";
    connected.textContent = "Connected";
    profileActions.appendChild(connected);
    return;
  }

  if (relation.connectionStatus === "outgoing_pending") {
    const sent = document.createElement("span");
    sent.className = "action-btn secondary";
    sent.textContent = "Request Sent";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "action-btn secondary";
    cancelBtn.textContent = "Cancel Request";
    cancelBtn.addEventListener("click", async () => {
      const response = await fetch(`/api/connections/requests/${relation.pendingRequestId}/cancel`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        showNotice(data.message || "Failed to cancel request.", "error");
        return;
      }
      await refreshProfile();
    });

    profileActions.appendChild(sent);
    profileActions.appendChild(cancelBtn);
    return;
  }

  if (relation.connectionStatus === "incoming_pending") {
    const acceptBtn = document.createElement("button");
    acceptBtn.className = "action-btn";
    acceptBtn.textContent = "Accept Request";
    acceptBtn.addEventListener("click", async () => {
      const response = await fetch(`/api/connections/requests/${relation.pendingRequestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      const data = await response.json();
      if (!response.ok) {
        showNotice(data.message || "Failed to accept request.", "error");
        return;
      }
      await refreshProfile();
    });

    const discardBtn = document.createElement("button");
    discardBtn.className = "action-btn secondary";
    discardBtn.textContent = "Discard";
    discardBtn.addEventListener("click", async () => {
      const response = await fetch(`/api/connections/requests/${relation.pendingRequestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discard" }),
      });
      const data = await response.json();
      if (!response.ok) {
        showNotice(data.message || "Failed to discard request.", "error");
        return;
      }
      await refreshProfile();
    });

    profileActions.appendChild(acceptBtn);
    profileActions.appendChild(discardBtn);
  }

  if (relation.canFollow) {
    const followBtn = document.createElement("button");
    followBtn.className = relation.isFollowing ? "action-btn secondary" : "action-btn";
    followBtn.textContent = relation.isFollowing ? "Unfollow Expert" : "Follow Expert";
    followBtn.addEventListener("click", async () => {
      const response = await fetch(`/api/follows/${profile.id}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        showNotice(data.message || "Failed to update follow.", "error");
        return;
      }
      await refreshProfile();
    });
    profileActions.appendChild(followBtn);
  }
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
  const sellerReviewsPanel = document.getElementById("sellerReviewsPanel");
  const sellerReviewsList = document.getElementById("sellerReviewsList");
  const sellerReviewForm = document.getElementById("sellerReviewForm");
  const sellerReviewRating = document.getElementById("sellerReviewRating");
  const sellerReviewText = document.getElementById("sellerReviewText");
  const submitSellerReviewBtn = document.getElementById("submitSellerReview");

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

    // Seller reviews panel: only relevant for seller profiles
    const isSellerProfile = profile.role === "General Vendor" || profile.role === "Verified Vendor";
    if (sellerReviewsPanel) sellerReviewsPanel.style.display = isSellerProfile ? "block" : "none";
    if (isSellerProfile && sellerReviewsList) {
      await loadSellerReviews(viewedUserId, sellerReviewsList);
    }

    // Show review form only for authenticated viewers who are NOT the profile owner
    if (sellerReviewForm) {
      sellerReviewForm.style.display = isSellerProfile && authState.authenticated && authState.userId !== profile.id ? 'block' : 'none';
    }

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

  if (submitSellerReviewBtn) {
    submitSellerReviewBtn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      // ensure auth
      const state = await getAuthState();
      if (!state.authenticated) {
        window.location.href = '/login.html';
        return;
      }

      const rating = Number(sellerReviewRating ? sellerReviewRating.value : 5);
      const comment = sellerReviewText ? sellerReviewText.value.trim() : '';

      try {
        const resp = await fetch(`/api/sellers/${viewedUserId}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating, comment }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          showNotice(data.message || 'Failed to post review', 'error');
          return;
        }
        showNotice('Review posted', 'success');
        if (sellerReviewsList) await loadSellerReviews(viewedUserId, sellerReviewsList);
        if (sellerReviewText) sellerReviewText.value = '';
      } catch (err) {
        console.error(err);
        showNotice('Failed to post review', 'error');
      }
    });
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
                <p class="request-item-role">${escapeHtml(row.role || "User")} • ${escapeHtml(row.districtLocation || "Unknown location")}</p>
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

