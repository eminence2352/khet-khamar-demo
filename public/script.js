const dictionary = {
  en: {
    appTagline: "Farmer Community",
    sharePlaceholder: "Share your farming update...",
    addPhoto: "Add Photo",
    postBtn: "Post",
    timeOne: "2 hours ago",
    timeTwo: "Yesterday at 5:40 PM",
    postOneText: "Just transplanted Boro paddy in Gazipur. Water level is stable after yesterday's rain.",
    postTwoText: "My chili plants show early flowering this week. Using compost tea every 4 days is helping a lot.",
    photoPlaceholder: "Crop Photo Placeholder",
    like: "Like",
    comment: "Comment",
    share: "Share",
    home: "Home",
    marketplace: "Market",
    weather: "Weather",
    profile: "Profile",
    toggleLabel: "বাংলা"
  },
  bn: {
    appTagline: "কৃষক কমিউনিটি",
    sharePlaceholder: "আপনার খামারের আপডেট লিখুন...",
    addPhoto: "ছবি যোগ করুন",
    postBtn: "পোস্ট",
    timeOne: "২ ঘণ্টা আগে",
    timeTwo: "গতকাল বিকাল ৫:৪০",
    postOneText: "আজ গাজীপুরে বোরো ধানের চারা রোপণ করলাম। গতকালের বৃষ্টির পরে জমিতে পানির স্তর ভাল আছে।",
    postTwoText: "এই সপ্তাহে আমার মরিচ গাছে আগাম ফুল এসেছে। প্রতি ৪ দিন পর কম্পোস্ট চা দিচ্ছি, ভাল ফল পাচ্ছি।",
    photoPlaceholder: "ফসলের ছবির স্থান",
    like: "লাইক",
    comment: "মন্তব্য",
    share: "শেয়ার",
    home: "হোম",
    marketplace: "মার্কেট",
    weather: "আবহাওয়া",
    profile: "প্রোফাইল",
    toggleLabel: "English"
  }
};

const body = document.body;
const toggleBtn = document.getElementById("langToggle");
const translatableNodes = document.querySelectorAll("[data-i18n]");
const translatablePlaceholders = document.querySelectorAll("[data-i18n-placeholder]");

function applyLanguage(lang) {
  body.dataset.lang = lang;

  translatableNodes.forEach((node) => {
    const key = node.dataset.i18n;
    const translatedValue = dictionary[lang][key];
    if (translatedValue) {
      node.textContent = translatedValue;
    }
  });

  translatablePlaceholders.forEach((node) => {
    const key = node.dataset.i18nPlaceholder;
    const translatedValue = dictionary[lang][key];
    if (translatedValue) {
      node.setAttribute("placeholder", translatedValue);
    }
  });

  toggleBtn.textContent = dictionary[lang].toggleLabel;
}

toggleBtn.addEventListener("click", () => {
  const nextLang = body.dataset.lang === "en" ? "bn" : "en";
  applyLanguage(nextLang);
});

applyLanguage("en");

const feedList = document.querySelector(".feed-list");
const marketplaceGrid = document.querySelector(".market-grid");
const postBtn = document.querySelector(".post-btn");
const postTextInput = document.getElementById("postText");
const postPhotoInput = document.getElementById("postPhoto");

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
  const lang = body.dataset.lang || "en";

  if (diffSeconds < 60) {
    return lang === "bn" ? "এইমাত্র" : "Just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return lang === "bn" ? `${diffMinutes} মিনিট আগে` : `${diffMinutes} minutes ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return lang === "bn" ? `${diffHours} ঘণ্টা আগে` : `${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return lang === "bn" ? `${diffDays} দিন আগে` : `${diffDays} days ago`;
}

function renderPosts(posts) {
  if (!feedList) {
    return;
  }

  if (!Array.isArray(posts) || posts.length === 0) {
    const emptyMessage = body.dataset.lang === "bn" ? "এখনও কোন পোস্ট নেই।" : "No posts yet.";
    feedList.innerHTML = `<article class="post-card"><p class="post-text">${emptyMessage}</p></article>`;
    return;
  }

  const actionLike = dictionary[body.dataset.lang || "en"].like;
  const actionComment = dictionary[body.dataset.lang || "en"].comment;
  const actionShare = dictionary[body.dataset.lang || "en"].share;

  feedList.innerHTML = posts
    .map((post, index) => {
      const userName = escapeHtml(post.userName || `User #${post.userId}`);
      const textContent = escapeHtml(post.textContent || "");
      const createdText = formatRelativeTime(post.createdAt);
      const avatarInitials = escapeHtml(getAvatarInitials(userName));
      const avatarClass = index % 2 === 0 ? "avatar-a" : "avatar-b";
      const postPhotoSection = post.imagePath
        ? `<div class="post-photo post-photo-has-image" role="img" aria-label="Uploaded post image"><img class="post-photo-img" src="${escapeHtml(post.imagePath)}" alt="Post image" /></div>`
        : `<div class="post-photo" role="img" aria-label="Crop photo placeholder"><span data-i18n="photoPlaceholder">${dictionary[body.dataset.lang || "en"].photoPlaceholder}</span></div>`;

      return `
      <article class="post-card">
        <header class="post-head">
          <div class="avatar ${avatarClass}">${avatarInitials}</div>
          <div class="post-user-meta">
            <h2 class="post-user">${userName}</h2>
            <p class="post-time">${createdText}</p>
          </div>
        </header>
        <p class="post-text">${textContent}</p>
        ${postPhotoSection}
        <footer class="post-actions" aria-label="Post actions">
          <button type="button"><i class="fa-regular fa-heart"></i> <span data-i18n="like">${actionLike}</span></button>
          <button type="button"><i class="fa-regular fa-comment"></i> <span data-i18n="comment">${actionComment}</span></button>
          <button type="button"><i class="fa-solid fa-share-nodes"></i> <span data-i18n="share">${actionShare}</span></button>
        </footer>
      </article>`;
    })
    .join("");
}

async function fetchPosts() {
  if (!feedList) {
    return;
  }

  try {
    const response = await fetch("/api/posts");
    if (!response.ok) {
      throw new Error("Failed to fetch posts");
    }

    const posts = await response.json();
    renderPosts(posts);
  } catch (error) {
    console.error(error);
    if (feedList) {
      const errorMessage = body.dataset.lang === "bn" ? "পোস্ট লোড করা যায়নি।" : "Unable to load posts.";
      feedList.innerHTML = `<article class="post-card"><p class="post-text">${errorMessage}</p></article>`;
    }
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
  const safePrice = Number.isFinite(priceValue) ? priceValue.toFixed(2).replace(/\.00$/, "") : String(ad.price || "0");
  const unit = ad.unit ? ` / ${escapeHtml(ad.unit)}` : "";
  return `৳ ${safePrice}${unit}`;
}

function renderMarketplaceAds(ads) {
  if (!marketplaceGrid) {
    return;
  }

  if (!Array.isArray(ads) || ads.length === 0) {
    const emptyMessage = body.dataset.lang === "bn" ? "এখনও কোন বিজ্ঞাপন নেই।" : "No marketplace ads yet.";
    marketplaceGrid.innerHTML = `<article class="market-card"><div class="market-body"><p class="market-seller">${emptyMessage}</p></div></article>`;
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

      return `
      <article class="market-card">
        <div class="market-image">
          <i class="fa-solid ${imageIconClass}"></i>
          <span data-i18n="marketImagePlaceholder">Product Image</span>
        </div>
        <div class="market-body">
          <h2 class="market-title">${productTitle}</h2>
          <p class="market-price">${formatPrice(ad)}</p>
          <p class="market-seller">
            ${sellerName}
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

async function fetchMarketplaceAds() {
  if (!marketplaceGrid) {
    return;
  }

  try {
    const response = await fetch("/api/marketplace");
    if (!response.ok) {
      throw new Error("Failed to fetch marketplace ads");
    }

    const ads = await response.json();
    renderMarketplaceAds(ads);
  } catch (error) {
    console.error(error);
    const errorMessage = body.dataset.lang === "bn" ? "বিজ্ঞাপন লোড করা যায়নি।" : "Unable to load marketplace ads.";
    marketplaceGrid.innerHTML = `<article class="market-card"><div class="market-body"><p class="market-seller">${errorMessage}</p></div></article>`;
  }
}

if (postBtn && postTextInput) {
  postBtn.addEventListener("click", async () => {
    const textContent = postTextInput.value.trim();
    const selectedImageFile = postPhotoInput && postPhotoInput.files ? postPhotoInput.files[0] : null;

    if (!textContent && !selectedImageFile) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("userId", "1");
      formData.append("textContent", textContent);
      if (selectedImageFile) {
        formData.append("image", selectedImageFile);
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      postTextInput.value = "";
      if (postPhotoInput) {
        postPhotoInput.value = "";
      }
      await fetchPosts();
    } catch (error) {
      console.error(error);
      alert(body.dataset.lang === "bn" ? "পোস্ট করা যায়নি।" : "Could not publish post.");
    }
  });
}

toggleBtn.addEventListener("click", () => {
  fetchPosts();
  filterMarketplaceAds();
});

let allMarketplaceAds = [];

const searchInput = document.querySelector('.market-filter-item.search-field input');
const categorySelect = document.getElementById('categorySelect');
const locationSelect = document.getElementById('locationSelect');

function filterMarketplaceAds() {
  if (!marketplaceGrid || !Array.isArray(allMarketplaceAds)) {
    return;
  }

  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const selectedCategory = categorySelect ? categorySelect.value : '';
  const selectedLocation = locationSelect ? locationSelect.value : '';

  const filtered = allMarketplaceAds.filter((ad) => {
    const matchesSearch =
      !searchTerm ||
      String(ad.productTitle || '').toLowerCase().includes(searchTerm) ||
      String(ad.description || '').toLowerCase().includes(searchTerm);

    const matchesCategory = !selectedCategory || ad.category === selectedCategory;
    const matchesLocation = !selectedLocation || ad.location === selectedLocation;

    return matchesSearch && matchesCategory && matchesLocation;
  });

  renderMarketplaceAds(filtered);
}

if (searchInput) {
  searchInput.addEventListener('input', filterMarketplaceAds);
}

if (categorySelect) {
  categorySelect.addEventListener('change', filterMarketplaceAds);
}

if (locationSelect) {
  locationSelect.addEventListener('change', filterMarketplaceAds);
}

async function fetchMarketplaceAdsWithFiltering() {
  if (!marketplaceGrid) {
    return;
  }

  try {
    const response = await fetch('/api/marketplace');
    if (!response.ok) {
      throw new Error('Failed to fetch marketplace ads');
    }

    allMarketplaceAds = await response.json();
    filterMarketplaceAds();
  } catch (error) {
    console.error(error);
    const errorMessage =
      body.dataset.lang === 'bn'
        ? 'বিজ্ঞাপন লোড করা যায়নি।'
        : 'Unable to load marketplace ads.';
    marketplaceGrid.innerHTML = `<article class="market-card"><div class="market-body"><p class="market-seller">${errorMessage}</p></div></article>`;
  }
}

fetchPosts();
fetchMarketplaceAdsWithFiltering();

// ============================================
// AUTHENTICATION & GUEST MODE
// ============================================

const createPostCard = document.getElementById('createPostCard');
const guestModePrompt = document.getElementById('guestModePrompt');
const loginLink = document.getElementById('loginLink');
const signupLink = document.getElementById('signupLink');
const logoutBtn = document.getElementById('logoutBtn');
const postBtnElement = document.querySelector('.post-btn');

// Check authentication status on page load
async function checkAuthentication() {
  try {
    const response = await fetch('/api/auth/check');
    const data = await response.json();

    if (data.authenticated) {
      // User is logged in
      showAuthenticatedUI();
    } else {
      // User is guest
      showGuestModeUI();
    }
  } catch (error) {
    console.error('Auth check error:', error);
    showGuestModeUI();
  }
}

function showAuthenticatedUI() {
  if (createPostCard) createPostCard.style.display = 'block';
  if (guestModePrompt) guestModePrompt.style.display = 'none';
  if (loginLink) loginLink.style.display = 'none';
  if (signupLink) signupLink.style.display = 'none';
  if (logoutBtn) {
    logoutBtn.style.display = 'block';
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/index.html';
    });
  }
}

function showGuestModeUI() {
  if (createPostCard) createPostCard.style.display = 'none';
  if (guestModePrompt) guestModePrompt.style.display = 'block';
  if (loginLink) loginLink.style.display = 'inline-block';
  if (signupLink) signupLink.style.display = 'inline-block';
  if (logoutBtn) logoutBtn.style.display = 'none';

  // Disable post creation for guests
  if (postBtn) {
    postBtn.disabled = true;
    postBtn.style.opacity = '0.5';
    postBtn.style.cursor = 'not-allowed';
  }
}

checkAuthentication();

// ============================================
// AGRICULTURAL NEWS
// ============================================

const newsList = document.getElementById('newsList');

function getNewsIconForCategory(category) {
  const icons = {
    Weather: '☀️',
    Market: '📊',
    Tips: '💡',
    Technology: '🤖',
    'Pest Control': '🐛',
    Irrigation: '💧',
    Seeds: '🌱',
    Government: '🏛️',
  };
  return icons[category] || '📰';
}

async function fetchAndDisplayNews() {
  if (!newsList) return;

  try {
    const response = await fetch('/api/news?limit=5');
    if (!response.ok) throw new Error('Failed to fetch news');

    const newsData = await response.json();

    if (newsData.length === 0) {
      newsList.innerHTML = '<p style="text-align: center; color: #999;">No news available at the moment.</p>';
      return;
    }

    newsList.innerHTML = newsData
      .map((news) => {
        const createdDate = new Date(news.createdAt);
        const dateStr = createdDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        const icon = getNewsIconForCategory(news.category);

        return `
          <article class="news-card">
            <div class="news-header">
              <div class="news-icon">${icon}</div>
              <div class="news-meta">
                <div class="news-category">${escapeHtml(news.category)}</div>
                <h3 class="news-title">${escapeHtml(news.title)}</h3>
              </div>
            </div>
            <p class="news-excerpt">${escapeHtml(news.excerpt || '')}</p>
            <div class="news-date">${dateStr} • ${escapeHtml(news.source || 'Khet-Khamar')}</div>
          </article>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Failed to fetch news:', error);
    newsList.innerHTML = '<p style="text-align: center; color: #999;">Unable to load news at the moment.</p>';
  }
}

fetchAndDisplayNews();

// Add translations for new strings
dictionary.en.guestModeMsg = "You're browsing as a guest.";
dictionary.en.loginToReact = "Login to post and react";
dictionary.en.agricultureNews = "Agriculture News & Updates";
dictionary.en.seeAll = "See All";
dictionary.en.login = "Login";
dictionary.en.signup = "Sign Up";
dictionary.en.logout = "Logout";

dictionary.bn.guestModeMsg = "আপনি অতিথি হিসেবে ব্রাউজ করছেন।";
dictionary.bn.loginToReact = "পোস্ট করতে এবং প্রতিক্রিয়া জানাতে লগইন করুন";
dictionary.bn.agricultureNews = "কৃষি সংবাদ এবং আপডেট";
dictionary.bn.seeAll = "সব দেখুন";
dictionary.bn.login = "লগইন";
dictionary.bn.signup = "সাইন আপ";
dictionary.bn.logout = "লগ আউট";