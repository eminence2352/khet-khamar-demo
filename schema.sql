-- ========================================
-- Khet-Khamar Agricultural Social Network & Marketplace
-- Simplified and optimized schema
-- ========================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS role_change_requests;
DROP TABLE IF EXISTS follows;
DROP TABLE IF EXISTS connections;
DROP TABLE IF EXISTS connection_requests;
DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS marketplace_ads;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS agricultural_news;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mobile_number VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('Farmer', 'Verified Expert', 'General Vendor', 'Verified Vendor', 'Admin') NOT NULL DEFAULT 'Farmer',
    district_location VARCHAR(50) NOT NULL,
    profile_picture_path VARCHAR(255) DEFAULT NULL,
    bio TEXT,
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_mobile_number (mobile_number),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role (role),
    KEY idx_users_district_location (district_location),
    KEY idx_users_active_created (is_active, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    post_type ENUM('text', 'news_share') NOT NULL DEFAULT 'text',
    text_content TEXT NOT NULL,
    image_path VARCHAR(255) DEFAULT NULL,
    shared_news_title VARCHAR(255) DEFAULT NULL,
    shared_news_excerpt TEXT,
    shared_news_url VARCHAR(500) DEFAULT NULL,
    shared_news_source VARCHAR(150) DEFAULT NULL,
    shared_news_category VARCHAR(80) DEFAULT NULL,
    likes_count INT NOT NULL DEFAULT 0,
    is_help_request TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_posts_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    KEY idx_posts_user_created (user_id, created_at),
    KEY idx_posts_active_created (is_active, created_at),
    KEY idx_posts_is_help_request (is_help_request)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    text_content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_comments_post_id FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    KEY idx_comments_post_created (post_id, created_at),
    KEY idx_comments_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE post_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_post_likes_post_id FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_likes_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_post_likes_post_user (post_id, user_id),
    KEY idx_post_likes_user_created (user_id, created_at),
    KEY idx_post_likes_post_created (post_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_id INT NOT NULL,
    actor_id INT NOT NULL,
    notification_type ENUM('like', 'comment', 'help_request') NOT NULL,
    post_id INT DEFAULT NULL,
    comment_id INT DEFAULT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_recipient_id FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_actor_id FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_post_id FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_comment_id FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    KEY idx_notifications_recipient_created (recipient_id, created_at),
    KEY idx_notifications_recipient_is_read (recipient_id, is_read),
    KEY idx_notifications_actor_created (actor_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE marketplace_ads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    product_title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category ENUM('Seeds', 'Equipment', 'Fertilizer', 'Pesticides', 'Produce', 'Tools', 'Services', 'Other') NOT NULL,
    location VARCHAR(100) NOT NULL,
    image_path VARCHAR(255) DEFAULT NULL,
    quantity INT DEFAULT NULL,
    unit VARCHAR(50) DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_marketplace_ads_vendor_id FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_marketplace_ads_price CHECK (price >= 0),
    CONSTRAINT chk_marketplace_ads_quantity CHECK (quantity IS NULL OR quantity >= 0),
    KEY idx_marketplace_ads_vendor_created (vendor_id, created_at),
    KEY idx_marketplace_ads_active_category_created (is_active, category, created_at),
    KEY idx_marketplace_ads_active_location (is_active, location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    marketplace_ad_id INT DEFAULT NULL,
    rating TINYINT NOT NULL,
    review_text TEXT,
    transaction_passed TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_reviews_buyer_id FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_marketplace_ad_id FOREIGN KEY (marketplace_ad_id) REFERENCES marketplace_ads(id) ON DELETE SET NULL,
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    KEY idx_reviews_seller_created (seller_id, created_at),
    KEY idx_reviews_buyer_created (buyer_id, created_at),
    KEY idx_reviews_ad_created (marketplace_ad_id, created_at),
    KEY idx_reviews_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE agricultural_news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    excerpt TEXT,
    content TEXT,
    category ENUM('Weather', 'Market', 'Tips', 'Technology', 'Pest Control', 'Irrigation', 'Seeds', 'Government') NOT NULL,
    image_url VARCHAR(255) DEFAULT NULL,
    source VARCHAR(100) DEFAULT NULL,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_agricultural_news_active_featured_created (is_active, is_featured, created_at),
    KEY idx_agricultural_news_category_created (category, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE connection_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'discarded') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME DEFAULT NULL,
    CONSTRAINT fk_connection_requests_sender_id FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_connection_requests_receiver_id FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_connection_requests_no_self CHECK (sender_id <> receiver_id),
    KEY idx_connection_requests_receiver_status_created (receiver_id, status, created_at),
    KEY idx_connection_requests_sender_status_created (sender_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_one_id INT NOT NULL,
    user_two_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_connections_user_one_id FOREIGN KEY (user_one_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_connections_user_two_id FOREIGN KEY (user_two_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_connections_no_self CHECK (user_one_id <> user_two_id),
    UNIQUE KEY uq_connections_pair (user_one_id, user_two_id),
    KEY idx_connections_user_one_created (user_one_id, created_at),
    KEY idx_connections_user_two_created (user_two_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE follows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    follower_id INT NOT NULL,
    expert_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_follows_follower_id FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_follows_expert_id FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_follows_no_self CHECK (follower_id <> expert_id),
    UNIQUE KEY uq_follows_pair (follower_id, expert_id),
    KEY idx_follows_expert_created (expert_id, created_at),
    KEY idx_follows_follower_created (follower_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_change_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    desired_role ENUM('Verified Expert', 'General Vendor') NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    reviewed_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME DEFAULT NULL,
    CONSTRAINT fk_role_change_requests_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_change_requests_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_role_change_requests_user_status_created (user_id, status, created_at),
    KEY idx_role_change_requests_status_created (status, created_at),
    KEY idx_role_change_requests_reviewer (reviewed_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Schema complete
-- ========================================
