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

const body = document.body;
const translatableNodes = document.querySelectorAll("[data-i18n]");
const translatablePlaceholders = document.querySelectorAll("[data-i18n-placeholder]");

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

const authState = {
  checked: false,
  authenticated: false,
  userId: null,
};

let currentUserProfile = null;

async function getAuthState(forceRefresh = false) {
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

async function getCurrentUserProfile(forceRefresh = false) {
  const state = await getAuthState(forceRefresh);
  if (!state.authenticated) {
    currentUserProfile = null;
    return null;
  }

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getAvatarInitials(name) {
  const safeName = String(name || "Anonymous User").trim();
  const parts = safeName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "AU";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

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

function profileUrlForUser(userId) {
  return `profile.html?userId=${encodeURIComponent(userId)}`;
}

function feedPostUrl(postId) {
  return `index.html?postId=${encodeURIComponent(postId)}`;
}

function renderPosts(posts, container) {
  if (!container) {
    return;
  }

  if (!Array.isArray(posts) || posts.length === 0) {
    container.innerHTML = '<article class="post-card"><p class="post-text">No posts yet.</p></article>';
    return;
  }

  const canAdminModerate = currentUserProfile && currentUserProfile.role === "Admin";

  container.innerHTML = posts
    .map((post, index) => {
      const userName = escapeHtml(post.userName || `User #${post.userId}`);
      const createdText = formatRelativeTime(post.createdAt);
      const avatarInitials = escapeHtml(getAvatarInitials(userName));
      const avatarClass = index % 2 === 0 ? "avatar-a" : "avatar-b";
      const profileUrl = profileUrlForUser(post.userId);
      const textContent = escapeHtml(post.textContent || "");
      const expertTag = post.userRole === "Verified Expert"
        ? '<span class="expert-share-tag">Expert Share</span>'
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
          : `<div class="post-photo" role="img" aria-label="Crop photo placeholder"><span>${dictionary.en.photoPlaceholder}</span></div>`;

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
            <p class="post-time">${createdText} ${expertTag}</p>
          </div>
        </header>
        ${postBody}
        <footer class="post-actions" aria-label="Post actions">
          <button type="button" class="js-like-btn ${post.likedByCurrentUser ? "liked" : ""}" data-post-id="${safePostId}"><i class="fa-regular fa-heart"></i> <span>${dictionary.en.like} (${Number(post.likesCount) || 0})</span></button>
          <button type="button" class="js-comment-btn" data-post-id="${safePostId}"><i class="fa-regular fa-comment"></i> <span>${dictionary.en.comment} (${Number(post.commentsCount) || 0})</span></button>
          <button type="button"><i class="fa-solid fa-share-nodes"></i> <span>${dictionary.en.share}</span></button>
          ${canAdminModerate ? `<button type="button" class="js-admin-delete-post" data-post-id="${safePostId}"><i class="fa-solid fa-trash"></i> <span>Delete</span></button>` : ""}
        </footer>
      </article>`;
    })
    .join("");
}

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

  if (!feedList) {
    return;
  }

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
      alert("Please select a valid image file.");
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

    if (!textContent && !selectedImageFile) {
      if (postTextInput) {
        postTextInput.focus();
      }
      return false;
    }

    const formData = new FormData();
    formData.append("textContent", textContent);
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
          alert(data.message || "Failed to update like.");
          return;
        }

        await fetchPosts({ container: feedList, targetPostId: postId });
      } catch (error) {
        console.error(error);
        alert("Failed to update like.");
      }
      return;
    }

    const commentButton = event.target.closest(".js-comment-btn");
    if (commentButton) {
      const state = await getAuthState();
      if (!state.authenticated) {
        window.location.href = "/login.html";
        return;
      }

      const postId = Number.parseInt(commentButton.dataset.postId, 10);
      if (!Number.isInteger(postId) || postId <= 0) {
        return;
      }

      const commentText = window.prompt("Write your comment:");
      if (commentText === null) {
        return;
      }

      const trimmedComment = String(commentText).trim();
      if (!trimmedComment) {
        alert("Comment cannot be empty.");
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
          alert(data.message || "Failed to add comment.");
          return;
        }

        await fetchPosts({ container: feedList, targetPostId: postId });
      } catch (error) {
        console.error(error);
        alert("Failed to add comment.");
      }
      return;
    }

    const deleteButton = event.target.closest(".js-admin-delete-post");
    if (!deleteButton) {
      return;
    }

    const me = await getCurrentUserProfile();
    if (!me || me.role !== "Admin") {
      alert("Admin access required.");
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
        alert(data.message || "Failed to delete post.");
        return;
      }

      await fetchPosts({ container: feedList });
    } catch (error) {
      console.error(error);
      alert("Failed to delete post.");
    }
  });

  if (postBtn && postTextInput) {
    postBtn.addEventListener("click", async () => {
      try {
        await submitComposerPost();
      } catch (error) {
        console.error(error);
        alert("Could not publish post.");
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
        alert("Could not publish post.");
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

function initMarketplacePage() {
  const marketplaceGrid = document.querySelector(".market-grid");
  if (!marketplaceGrid) {
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
}

function renderProfileSummary(profile) {
  const profileCard = document.getElementById("profileCard");
  if (!profileCard) {
    return;
  }

  const initials = escapeHtml(getAvatarInitials(profile.fullName));
  const verifiedBadge = profile.isVerified
    ? '<span class="verified-badge"><i class="fa-solid fa-circle-check"></i> Verified</span>'
    : "";

  profileCard.innerHTML = `
    <div class="profile-card-top">
      <div class="avatar avatar-owner">${initials}</div>
      <div>
        <h2 class="profile-name">${escapeHtml(profile.fullName)}</h2>
        <p class="profile-role">${escapeHtml(profile.role)} • ${escapeHtml(profile.districtLocation || "Unknown location")} ${verifiedBadge}</p>
      </div>
    </div>
    <p class="profile-bio">${escapeHtml(profile.bio || "No bio yet.")}</p>
    <div class="profile-stats">
      <div class="profile-stat"><strong>${profile.postsCount}</strong><span>Posts</span></div>
      <div class="profile-stat"><strong>${profile.connectionsCount}</strong><span>Connections</span></div>
      <div class="profile-stat"><strong>${profile.followersCount}</strong><span>Followers</span></div>
      <div class="profile-stat"><strong>${profile.followingCount}</strong><span>Following</span></div>
    </div>
  `;
}

function renderProfileActions(profile, refreshProfile) {
  const profileActions = document.getElementById("profileActions");
  if (!profileActions) {
    return;
  }

  profileActions.innerHTML = "";

  if (profile.isOwnProfile) {
    profileActions.innerHTML = '<span class="action-btn secondary">This is your profile</span>';
    return;
  }

  if (!authState.authenticated) {
    profileActions.innerHTML = '<a class="action-btn" href="login.html">Login to connect</a>';
    return;
  }

  const relation = profile.relation || {};

  if (relation.canConnect) {
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
          alert(data.message || "Failed to send connection request.");
          return;
        }

        alert("Connection request sent.");
        await refreshProfile();
      });
      profileActions.appendChild(connectBtn);
    } else if (relation.connectionStatus === "connected") {
      const connected = document.createElement("span");
      connected.className = "action-btn secondary";
      connected.textContent = "Connected";
      profileActions.appendChild(connected);
    } else if (relation.connectionStatus === "outgoing_pending") {
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
          alert(data.message || "Failed to cancel request.");
          return;
        }
        await refreshProfile();
      });

      profileActions.appendChild(sent);
      profileActions.appendChild(cancelBtn);
    } else if (relation.connectionStatus === "incoming_pending") {
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
          alert(data.message || "Failed to accept request.");
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
          alert(data.message || "Failed to discard request.");
          return;
        }
        await refreshProfile();
      });

      profileActions.appendChild(acceptBtn);
      profileActions.appendChild(discardBtn);
    }
  }

  if (relation.canFollow) {
    const followBtn = document.createElement("button");
    followBtn.className = relation.isFollowing ? "action-btn secondary" : "action-btn";
    followBtn.textContent = relation.isFollowing ? "Unfollow Expert" : "Follow Expert";
    followBtn.addEventListener("click", async () => {
      const response = await fetch(`/api/follows/${profile.id}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || "Failed to update follow.");
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
  const settingsPanel = document.getElementById("settingsPanel");
  const changePasswordForm = document.getElementById("changePasswordForm");
  const likedPostsPanel = document.getElementById("likedPostsPanel");
  const likedPostsList = document.getElementById("likedPostsList");
  const commentedPostsPanel = document.getElementById("commentedPostsPanel");
  const commentedPostsList = document.getElementById("commentedPostsList");
  const roleRequestForm = document.getElementById("roleRequestForm");
  const roleRequestStatus = document.getElementById("roleRequestStatus");
  const adminToolsPanel = document.getElementById("adminToolsPanel");
  const grantExpertBtn = document.getElementById("grantExpertBtn");
  const grantSellerBtn = document.getElementById("grantSellerBtn");

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
    if (settingsPanel) settingsPanel.style.display = isOwnAndAuthenticated ? "block" : "none";
    if (likedPostsPanel) likedPostsPanel.style.display = isOwnAndAuthenticated ? "block" : "none";
    if (commentedPostsPanel) commentedPostsPanel.style.display = isOwnAndAuthenticated ? "block" : "none";
    if (adminToolsPanel) adminToolsPanel.style.display = canGrant ? "block" : "none";

    if (isOwnAndAuthenticated) {
      await loadConnectionRequests();
      await loadConnections();
      await loadMyActivity();
      await loadRoleRequestStatus();
    }
  }

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

      roleRequestStatus.textContent = `Latest request: ${latest.desiredRole} (${latest.status})`;
    } catch (error) {
      console.error(error);
      roleRequestStatus.textContent = "Unable to load role request status.";
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
        alert(dataAction.message || "Failed to respond to request.");
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
        alert(dataCancel.message || "Failed to cancel request.");
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

  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const currentPasswordInput = document.getElementById("currentPassword");
      const newPasswordInput = document.getElementById("newPassword");

      const currentPassword = currentPasswordInput ? currentPasswordInput.value : "";
      const newPassword = newPasswordInput ? newPasswordInput.value : "";

      if (!currentPassword || !newPassword) {
        alert("Please fill in both password fields.");
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
          alert(data.message || "Failed to change password.");
          return;
        }

        alert("Password changed successfully.");
        changePasswordForm.reset();
      } catch (error) {
        console.error(error);
        alert("Failed to change password.");
      }
    });
  }

  if (roleRequestForm) {
    roleRequestForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const roleSelect = document.getElementById("desiredRole");
      const desiredRole = roleSelect ? roleSelect.value : "";

      if (!desiredRole) {
        alert("Please select a role.");
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
          alert(data.message || "Failed to submit role request.");
          return;
        }

        alert("Role request submitted to admin.");
        await loadRoleRequestStatus();
      } catch (error) {
        console.error(error);
        alert("Failed to submit role request.");
      }
    });
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
        alert(data.message || "Failed to grant role.");
        return;
      }

      alert("Role granted successfully.");
      await refreshProfile();
    } catch (error) {
      console.error(error);
      alert("Failed to grant role.");
    }
  }

  if (grantExpertBtn) {
    grantExpertBtn.addEventListener("click", () => grantRoleFromAdmin("expert"));
  }

  if (grantSellerBtn) {
    grantSellerBtn.addEventListener("click", () => grantRoleFromAdmin("seller"));
  }

  await refreshProfile();
}

initFeedPage();
initMarketplacePage();
initProfilePage();
