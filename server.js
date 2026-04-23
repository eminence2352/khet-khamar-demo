const path = require('path');
const fs = require('fs');
const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'khet-khamar-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

app.use(express.static(path.join(__dirname, 'public')));

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `post-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const allowedExtensions = new Set([
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff', '.svg',
      '.heic', '.heif', '.avif', '.jfif', '.ico',
    ]);

    if ((file.mimetype && file.mimetype.startsWith('image/')) || allowedExtensions.has(extension)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image files are allowed'));
  },
});

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const db = pool.promise();

let externalNewsCache = {
  rows: [],
  cachedAt: 0,
};

async function resolvePostingUserId(requestedUserId) {
  const preferredId = Number(requestedUserId) || 1;

  const [preferredUserRows] = await db.query(
    'SELECT id FROM users WHERE id = ? LIMIT 1',
    [preferredId]
  );

  if (preferredUserRows.length > 0) {
    return preferredUserRows[0].id;
  }

  const [existingUsers] = await db.query('SELECT id FROM users ORDER BY id ASC LIMIT 1');
  if (existingUsers.length > 0) {
    return existingUsers[0].id;
  }

  const [insertResult] = await db.query(
    `INSERT INTO users (mobile_number, password_hash, full_name, district_location)
     VALUES (?, ?, ?, ?)`,
    ['01700000001', 'prototype_password_hash', 'Khet-Khamar Demo User', 'Dhaka']
  );

  return insertResult.insertId;
}

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    return;
  }
  console.log('MySQL database connected successfully.');
  connection.release();
});

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }

  if (req.session.authMode === 'admin') {
    return res.status(403).json({ message: 'Please login as a normal user for this action.' });
  }

  next();
};

const requireAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT role FROM users WHERE id = ? LIMIT 1',
      [req.session.userId]
    );

    if (rows.length === 0 || rows[0].role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    next();
  } catch (error) {
    console.error('Failed to verify admin access:', error.message);
    res.status(500).json({ message: 'Failed to verify admin access' });
  }
};

function desiredRoleToDbRole(desiredRole) {
  const normalized = String(desiredRole || '').trim().toLowerCase();
  if (normalized === 'expert') {
    return 'Verified Expert';
  }
  if (normalized === 'seller') {
    return 'General Vendor';
  }
  return null;
}

function normalizeConnectionPair(userA, userB) {
  return userA < userB ? [userA, userB] : [userB, userA];
}

function isExpertRole(role) {
  return role === 'Verified Expert';
}

async function getConnectionRelation(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { status: 'self', pendingRequestId: null };
  }

  const [firstUserId, secondUserId] = normalizeConnectionPair(currentUserId, targetUserId);
  const [connectedRows] = await db.query(
    `SELECT id
     FROM connections
     WHERE user_one_id = ? AND user_two_id = ?
     LIMIT 1`,
    [firstUserId, secondUserId]
  );

  if (connectedRows.length > 0) {
    return { status: 'connected', pendingRequestId: null };
  }

  const [pendingRows] = await db.query(
    `SELECT id, sender_id
     FROM connection_requests
     WHERE status = 'pending'
       AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
     ORDER BY created_at DESC
     LIMIT 1`,
    [currentUserId, targetUserId, targetUserId, currentUserId]
  );

  if (pendingRows.length === 0) {
    return { status: 'none', pendingRequestId: null };
  }

  const pendingRow = pendingRows[0];
  if (pendingRow.sender_id === currentUserId) {
    return { status: 'outgoing_pending', pendingRequestId: pendingRow.id };
  }

  return { status: 'incoming_pending', pendingRequestId: pendingRow.id };
}

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

// Sign up
app.post('/api/auth/signup', async (req, res) => {
  const { mobile_number, email, password, full_name, district_location } = req.body;

  if (!mobile_number || !email || !password || !full_name || !district_location) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE mobile_number = ? OR email = ? LIMIT 1',
      [mobile_number, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Mobile number or email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user
    const [result] = await db.query(
      `INSERT INTO users (mobile_number, email, password_hash, full_name, district_location)
       VALUES (?, ?, ?, ?, ?)`,
      [mobile_number, email, passwordHash, full_name, district_location]
    );

    const userId = result.insertId;

    // Set session
    req.session.userId = userId;
    req.session.authMode = 'user';

    res.status(201).json({
      message: 'Signup successful',
      userId,
      user: { mobile_number, email, full_name },
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ message: 'Signup failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { mobile_number, password } = req.body;

  if (!mobile_number || !password) {
    return res.status(400).json({ message: 'Mobile number and password are required' });
  }

  try {
    // Find user
    const [users] = await db.query(
      'SELECT id, password_hash, full_name, email, role FROM users WHERE mobile_number = ? LIMIT 1',
      [mobile_number]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid mobile number or password' });
    }

    const user = users[0];

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid mobile number or password' });
    }

    if (user.role === 'Admin') {
      return res.status(403).json({ message: 'Admin must login from admin login page.' });
    }

    // Set session
    req.session.userId = user.id;
    req.session.authMode = 'user';

    res.json({
      message: 'Login successful',
      userId: user.id,
      user: { id: user.id, full_name: user.full_name, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Admin login (separate from normal login)
app.post('/api/admin/login', async (req, res) => {
  const { mobile_number, password } = req.body;

  if (!mobile_number || !password) {
    return res.status(400).json({ message: 'Mobile number and password are required' });
  }

  try {
    const [users] = await db.query(
      'SELECT id, password_hash, full_name, email, role FROM users WHERE mobile_number = ? LIMIT 1',
      [mobile_number]
    );

    if (users.length === 0 || users[0].role !== 'Admin') {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const adminUser = users[0];
    const passwordMatch = await bcrypt.compare(password, adminUser.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    req.session.userId = adminUser.id;
    req.session.authMode = 'admin';

    res.json({
      message: 'Admin login successful',
      userId: adminUser.id,
      user: {
        id: adminUser.id,
        full_name: adminUser.full_name,
        email: adminUser.email,
        role: adminUser.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error.message);
    res.status(500).json({ message: 'Admin login failed' });
  }
});

// Get current user
app.get('/api/auth/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const [users] = await db.query(
      'SELECT id, mobile_number, email, full_name, role, district_location, profile_picture_path, bio FROM users WHERE id = ? LIMIT 1',
      [req.session.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Check authentication status
app.get('/api/auth/check', (req, res) => {
  if (!req.session.userId) {
    return res.json({ authenticated: false, userId: null, mode: 'guest' });
  }

  if (req.session.authMode === 'admin') {
    return res.json({ authenticated: false, userId: null, mode: 'admin' });
  }

  res.json({ authenticated: true, userId: req.session.userId, mode: 'user' });
});

app.get('/api/status', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.get('/api/posts', async (req, res) => {
  try {
    const requestedUserId = Number.parseInt(req.query.userId, 10);
    const hasUserFilter = Number.isInteger(requestedUserId) && requestedUserId > 0;
    const currentUserId = Number(req.session.userId) || 0;

    const params = [currentUserId, currentUserId];
    let sql = `SELECT
      p.id,
      p.user_id AS userId,
      p.post_type AS postType,
      p.text_content AS textContent,
      p.image_path AS imagePath,
      p.shared_news_title AS sharedNewsTitle,
      p.shared_news_excerpt AS sharedNewsExcerpt,
      p.shared_news_url AS sharedNewsUrl,
      p.shared_news_source AS sharedNewsSource,
      p.shared_news_category AS sharedNewsCategory,
      p.likes_count AS likesCount,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS commentsCount,
      CASE
        WHEN ? > 0 THEN EXISTS(
          SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?
        )
        ELSE 0
      END AS likedByCurrentUser,
      p.created_at AS createdAt,
      u.full_name AS userName,
      u.role AS userRole,
      u.profile_picture_path AS userProfilePicture
    FROM posts p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.is_active = TRUE`;

    if (hasUserFilter) {
      sql += ' AND p.user_id = ?';
      params.push(requestedUserId);
    }

    sql += ' ORDER BY p.created_at DESC';

    const [rows] = await db.query(sql, params);

    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch posts:', error.message);
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
});

app.post('/api/posts', requireAuth, upload.single('image'), async (req, res) => {
  const { textContent } = req.body;
  const trimmedText = String(textContent || '').trim();
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  if (!trimmedText && !imagePath) {
    return res.status(400).json({ message: 'textContent or image is required' });
  }

  try {
    const userId = req.session.userId;

    const [result] = await db.query(
      'INSERT INTO posts (user_id, text_content, image_path) VALUES (?, ?, ?)',
      [userId, trimmedText || '', imagePath]
    );

    res.status(201).json({
      message: 'Post created successfully',
      postId: result.insertId,
      imagePath,
    });
  } catch (error) {
    console.error('Failed to create post:', error.message);
    res.status(500).json({ message: 'Failed to create post' });
  }
});

app.post('/api/posts/:postId/like', requireAuth, async (req, res) => {
  const postId = Number.parseInt(req.params.postId, 10);
  const userId = Number(req.session.userId);

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: 'Invalid post id.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [postRows] = await connection.query(
      'SELECT id FROM posts WHERE id = ? AND is_active = TRUE LIMIT 1',
      [postId]
    );

    if (postRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Post not found.' });
    }

    const [existingRows] = await connection.query(
      'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1',
      [postId, userId]
    );

    if (existingRows.length > 0) {
      await connection.query(
        'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
        [postId, userId]
      );
      await connection.query(
        'UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?',
        [postId]
      );
      await connection.commit();
      return res.json({ message: 'Post unliked.', liked: false });
    }

    await connection.query(
      'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
      [postId, userId]
    );
    await connection.query(
      'UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?',
      [postId]
    );

    await connection.commit();
    res.status(201).json({ message: 'Post liked.', liked: true });
  } catch (error) {
    await connection.rollback();
    console.error('Failed to toggle post like:', error.message);
    res.status(500).json({ message: 'Failed to update like' });
  } finally {
    connection.release();
  }
});

app.post('/api/posts/:postId/comments', requireAuth, async (req, res) => {
  const postId = Number.parseInt(req.params.postId, 10);
  const userId = Number(req.session.userId);
  const textContent = String(req.body.textContent || '').trim();

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: 'Invalid post id.' });
  }

  if (!textContent) {
    return res.status(400).json({ message: 'Comment text is required.' });
  }

  try {
    const [postRows] = await db.query(
      'SELECT id FROM posts WHERE id = ? AND is_active = TRUE LIMIT 1',
      [postId]
    );
    if (postRows.length === 0) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const [result] = await db.query(
      `INSERT INTO comments (post_id, user_id, text_content)
       VALUES (?, ?, ?)`,
      [postId, userId, textContent]
    );

    res.status(201).json({ message: 'Comment added.', commentId: result.insertId });
  } catch (error) {
    console.error('Failed to add comment:', error.message);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

app.delete('/api/admin/posts/:postId', requireAdmin, async (req, res) => {
  const postId = Number.parseInt(req.params.postId, 10);

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: 'Invalid post id.' });
  }

  try {
    const [result] = await db.query('DELETE FROM posts WHERE id = ?', [postId]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Post not found.' });
    }
    res.json({ message: 'Post deleted by admin.' });
  } catch (error) {
    console.error('Failed to delete post by admin:', error.message);
    res.status(500).json({ message: 'Failed to delete post' });
  }
});

app.delete('/api/admin/comments/:commentId', requireAdmin, async (req, res) => {
  const commentId = Number.parseInt(req.params.commentId, 10);

  if (!Number.isInteger(commentId) || commentId <= 0) {
    return res.status(400).json({ message: 'Invalid comment id.' });
  }

  try {
    const [result] = await db.query('DELETE FROM comments WHERE id = ?', [commentId]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Comment not found.' });
    }
    res.json({ message: 'Comment deleted by admin.' });
  } catch (error) {
    console.error('Failed to delete comment by admin:', error.message);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
});

app.post('/api/news/share', requireAuth, async (req, res) => {
  const { title, excerpt, url, source, category, caption } = req.body;

  const trimmedTitle = String(title || '').trim();
  const trimmedExcerpt = String(excerpt || '').trim();
  const trimmedUrl = String(url || '').trim();
  const trimmedSource = String(source || '').trim();
  const trimmedCategory = String(category || '').trim();
  const trimmedCaption = String(caption || '').trim();

  if (!trimmedTitle) {
    return res.status(400).json({ message: 'News title is required to share.' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO posts
       (user_id, post_type, text_content, shared_news_title, shared_news_excerpt, shared_news_url, shared_news_source, shared_news_category)
       VALUES (?, 'news_share', ?, ?, ?, ?, ?, ?)`,
      [
        req.session.userId,
        trimmedCaption,
        trimmedTitle,
        trimmedExcerpt || null,
        trimmedUrl || null,
        trimmedSource || null,
        trimmedCategory || null,
      ]
    );

    res.status(201).json({ message: 'News shared to feed.', postId: result.insertId });
  } catch (error) {
    console.error('Failed to share news:', error.message);
    res.status(500).json({ message: 'Failed to share news' });
  }
});

app.get('/api/profiles/:userId', async (req, res) => {
  const targetUserId = Number.parseInt(req.params.userId, 10);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ message: 'Invalid profile user id.' });
  }

  try {
    const [profileRows] = await db.query(
      `SELECT
        u.id,
        u.full_name AS fullName,
        u.role,
        u.email,
        u.mobile_number AS mobileNumber,
        u.district_location AS districtLocation,
        u.profile_picture_path AS profilePicture,
        u.bio,
        u.is_verified AS isVerified,
        u.created_at AS createdAt,
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id AND p.is_active = TRUE) AS postsCount,
        (SELECT COUNT(*) FROM connections c WHERE c.user_one_id = u.id OR c.user_two_id = u.id) AS connectionsCount,
        (SELECT COUNT(*) FROM follows f WHERE f.expert_id = u.id) AS followersCount,
        (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) AS followingCount
      FROM users u
      WHERE u.id = ?
      LIMIT 1`,
      [targetUserId]
    );

    if (profileRows.length === 0) {
      return res.status(404).json({ message: 'Profile not found.' });
    }

    const profile = profileRows[0];
    const currentUserId = Number(req.session.userId) || null;
    const isOwnProfile = currentUserId === targetUserId;

    let currentUserRole = null;
    if (currentUserId) {
      const [viewerRows] = await db.query(
        'SELECT role FROM users WHERE id = ? LIMIT 1',
        [currentUserId]
      );
      currentUserRole = viewerRows.length > 0 ? viewerRows[0].role : null;
    }

    const relation = currentUserId
      ? await getConnectionRelation(currentUserId, targetUserId)
      : { status: 'none', pendingRequestId: null };

    let isFollowing = false;
    let canFollow = false;

    if (currentUserId && !isOwnProfile && isExpertRole(currentUserRole) && isExpertRole(profile.role)) {
      canFollow = true;
      const [followRows] = await db.query(
        `SELECT id
         FROM follows
         WHERE follower_id = ? AND expert_id = ?
         LIMIT 1`,
        [currentUserId, targetUserId]
      );
      isFollowing = followRows.length > 0;
    }

    res.json({
      ...profile,
      isOwnProfile,
      relation: {
        connectionStatus: relation.status,
        pendingRequestId: relation.pendingRequestId,
        canConnect: Boolean(currentUserId) && !isOwnProfile,
        canFollow,
        isFollowing,
      },
    });
  } catch (error) {
    console.error('Failed to fetch profile:', error.message);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

app.post('/api/connections/request', requireAuth, async (req, res) => {
  const senderId = Number(req.session.userId);
  const receiverId = Number.parseInt(req.body.receiverId, 10);

  if (!Number.isInteger(receiverId) || receiverId <= 0) {
    return res.status(400).json({ message: 'Invalid receiver id.' });
  }

  if (senderId === receiverId) {
    return res.status(400).json({ message: 'You cannot connect with yourself.' });
  }

  try {
    const [receiverRows] = await db.query('SELECT id FROM users WHERE id = ? LIMIT 1', [receiverId]);
    if (receiverRows.length === 0) {
      return res.status(404).json({ message: 'Target user not found.' });
    }

    const [userOneId, userTwoId] = normalizeConnectionPair(senderId, receiverId);
    const [connectionRows] = await db.query(
      'SELECT id FROM connections WHERE user_one_id = ? AND user_two_id = ? LIMIT 1',
      [userOneId, userTwoId]
    );
    if (connectionRows.length > 0) {
      return res.status(409).json({ message: 'You are already connected.' });
    }

    const [pendingRows] = await db.query(
      `SELECT id, sender_id
       FROM connection_requests
       WHERE status = 'pending'
         AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       LIMIT 1`,
      [senderId, receiverId, receiverId, senderId]
    );

    if (pendingRows.length > 0) {
      if (pendingRows[0].sender_id === senderId) {
        return res.status(409).json({ message: 'Connection request already sent.' });
      }
      return res.status(409).json({ message: 'This user already sent you a request. Accept it from requests.' });
    }

    const [result] = await db.query(
      `INSERT INTO connection_requests (sender_id, receiver_id, status)
       VALUES (?, ?, 'pending')`,
      [senderId, receiverId]
    );

    res.status(201).json({ message: 'Connection request sent.', requestId: result.insertId });
  } catch (error) {
    console.error('Failed to send connection request:', error.message);
    res.status(500).json({ message: 'Failed to send connection request' });
  }
});

app.get('/api/connections/requests', requireAuth, async (req, res) => {
  const currentUserId = Number(req.session.userId);

  try {
    const [incoming] = await db.query(
      `SELECT
        cr.id,
        cr.created_at AS createdAt,
        u.id AS userId,
        u.full_name AS fullName,
        u.role,
        u.profile_picture_path AS profilePicture
      FROM connection_requests cr
      JOIN users u ON u.id = cr.sender_id
      WHERE cr.receiver_id = ? AND cr.status = 'pending'
      ORDER BY cr.created_at DESC`,
      [currentUserId]
    );

    const [outgoing] = await db.query(
      `SELECT
        cr.id,
        cr.created_at AS createdAt,
        u.id AS userId,
        u.full_name AS fullName,
        u.role,
        u.profile_picture_path AS profilePicture
      FROM connection_requests cr
      JOIN users u ON u.id = cr.receiver_id
      WHERE cr.sender_id = ? AND cr.status = 'pending'
      ORDER BY cr.created_at DESC`,
      [currentUserId]
    );

    res.json({ incoming, outgoing });
  } catch (error) {
    console.error('Failed to fetch connection requests:', error.message);
    res.status(500).json({ message: 'Failed to fetch connection requests' });
  }
});

app.post('/api/connections/requests/:requestId/cancel', requireAuth, async (req, res) => {
  const requestId = Number.parseInt(req.params.requestId, 10);
  const senderId = Number(req.session.userId);

  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ message: 'Invalid request id.' });
  }

  try {
    const [requestRows] = await db.query(
      `SELECT id
       FROM connection_requests
       WHERE id = ? AND sender_id = ? AND status = 'pending'
       LIMIT 1`,
      [requestId, senderId]
    );

    if (requestRows.length === 0) {
      return res.status(404).json({ message: 'Pending outgoing request not found.' });
    }

    await db.query(
      `UPDATE connection_requests
       SET status = 'discarded', responded_at = NOW()
       WHERE id = ?`,
      [requestId]
    );

    res.json({ message: 'Connection request canceled.' });
  } catch (error) {
    console.error('Failed to cancel connection request:', error.message);
    res.status(500).json({ message: 'Failed to cancel connection request' });
  }
});

app.post('/api/connections/requests/:requestId/respond', requireAuth, async (req, res) => {
  const requestId = Number.parseInt(req.params.requestId, 10);
  const action = String(req.body.action || '').trim().toLowerCase();

  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ message: 'Invalid request id.' });
  }

  if (!['accept', 'discard'].includes(action)) {
    return res.status(400).json({ message: 'Action must be accept or discard.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [requestRows] = await connection.query(
      `SELECT id, sender_id, receiver_id
       FROM connection_requests
       WHERE id = ? AND status = 'pending' AND receiver_id = ?
       LIMIT 1`,
      [requestId, Number(req.session.userId)]
    );

    if (requestRows.length === 0) {
      const [anyRows] = await connection.query(
        `SELECT id
         FROM connection_requests
         WHERE id = ? AND receiver_id = ?
         LIMIT 1`,
        [requestId, Number(req.session.userId)]
      );

      await connection.rollback();
      if (anyRows.length > 0) {
        return res.status(409).json({ message: 'Request is no longer pending. It may have been canceled already.' });
      }
      return res.status(404).json({ message: 'Pending request not found.' });
    }

    const requestRow = requestRows[0];

    if (action === 'discard') {
      await connection.query(
        `UPDATE connection_requests
         SET status = 'discarded', responded_at = NOW()
         WHERE id = ?`,
        [requestId]
      );
      await connection.commit();
      return res.json({ message: 'Connection request discarded.' });
    }

    await connection.query(
      `UPDATE connection_requests
       SET status = 'accepted', responded_at = NOW()
       WHERE id = ?`,
      [requestId]
    );

    const [userOneId, userTwoId] = normalizeConnectionPair(requestRow.sender_id, requestRow.receiver_id);
    await connection.query(
      `INSERT IGNORE INTO connections (user_one_id, user_two_id)
       VALUES (?, ?)`,
      [userOneId, userTwoId]
    );

    await connection.commit();
    res.json({ message: 'Connection request accepted.' });
  } catch (error) {
    await connection.rollback();
    console.error('Failed to respond to connection request:', error.message);
    res.status(500).json({ message: 'Failed to respond to connection request' });
  } finally {
    connection.release();
  }
});

app.get('/api/connections', requireAuth, async (req, res) => {
  const currentUserId = Number(req.session.userId);

  try {
    const [rows] = await db.query(
      `SELECT
        c.id,
        c.created_at AS connectedAt,
        u.id AS userId,
        u.full_name AS fullName,
        u.role,
        u.profile_picture_path AS profilePicture,
        u.district_location AS districtLocation
      FROM connections c
      JOIN users u ON u.id = IF(c.user_one_id = ?, c.user_two_id, c.user_one_id)
      WHERE c.user_one_id = ? OR c.user_two_id = ?
      ORDER BY c.created_at DESC`,
      [currentUserId, currentUserId, currentUserId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch connections:', error.message);
    res.status(500).json({ message: 'Failed to fetch connections' });
  }
});

app.post('/api/follows/:expertId', requireAuth, async (req, res) => {
  const followerId = Number(req.session.userId);
  const expertId = Number.parseInt(req.params.expertId, 10);

  if (!Number.isInteger(expertId) || expertId <= 0) {
    return res.status(400).json({ message: 'Invalid expert id.' });
  }

  if (followerId === expertId) {
    return res.status(400).json({ message: 'You cannot follow yourself.' });
  }

  try {
    const [roleRows] = await db.query(
      'SELECT id, role FROM users WHERE id IN (?, ?)',
      [followerId, expertId]
    );

    if (roleRows.length < 2) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const roleById = roleRows.reduce((acc, row) => {
      acc[row.id] = row.role;
      return acc;
    }, {});

    if (!isExpertRole(roleById[followerId]) || !isExpertRole(roleById[expertId])) {
      return res.status(403).json({ message: 'Follow is available only between expert users.' });
    }

    const [existingRows] = await db.query(
      `SELECT id
       FROM follows
       WHERE follower_id = ? AND expert_id = ?
       LIMIT 1`,
      [followerId, expertId]
    );

    if (existingRows.length > 0) {
      await db.query('DELETE FROM follows WHERE follower_id = ? AND expert_id = ?', [followerId, expertId]);
      return res.json({ message: 'Unfollowed expert.', following: false });
    }

    await db.query(
      'INSERT INTO follows (follower_id, expert_id) VALUES (?, ?)',
      [followerId, expertId]
    );
    res.status(201).json({ message: 'Now following expert.', following: true });
  } catch (error) {
    console.error('Failed to update follow:', error.message);
    res.status(500).json({ message: 'Failed to update follow' });
  }
});

app.post('/api/settings/change-password', requireAuth, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
      [req.session.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, req.session.userId]
    );

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Failed to change password:', error.message);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

app.get('/api/settings/role-request', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, desired_role AS desiredRole, status, created_at AS createdAt, responded_at AS respondedAt
       FROM role_change_requests
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.session.userId]
    );

    if (rows.length === 0) {
      return res.json({ latestRequest: null });
    }

    res.json({ latestRequest: rows[0] });
  } catch (error) {
    console.error('Failed to fetch role request status:', error.message);
    res.status(500).json({ message: 'Failed to fetch role request status' });
  }
});

app.post('/api/settings/role-request', requireAuth, async (req, res) => {
  const desiredRole = desiredRoleToDbRole(req.body.desiredRole);
  const userId = Number(req.session.userId);

  if (!desiredRole) {
    return res.status(400).json({ message: 'Desired role must be expert or seller.' });
  }

  try {
    const [pendingRows] = await db.query(
      `SELECT id
       FROM role_change_requests
       WHERE user_id = ? AND status = 'pending'
       LIMIT 1`,
      [userId]
    );

    if (pendingRows.length > 0) {
      return res.status(409).json({ message: 'You already have a pending role request.' });
    }

    const [currentRoleRows] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [userId]);
    if (currentRoleRows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (currentRoleRows[0].role === desiredRole) {
      return res.status(409).json({ message: 'You already have this role.' });
    }

    const [result] = await db.query(
      `INSERT INTO role_change_requests (user_id, desired_role, status)
       VALUES (?, ?, 'pending')`,
      [userId, desiredRole]
    );

    res.status(201).json({ message: 'Role request submitted.', requestId: result.insertId });
  } catch (error) {
    console.error('Failed to submit role request:', error.message);
    res.status(500).json({ message: 'Failed to submit role request' });
  }
});

app.get('/api/admin/role-requests', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        r.id,
        r.desired_role AS desiredRole,
        r.status,
        r.created_at AS createdAt,
        r.responded_at AS respondedAt,
        u.id AS userId,
        u.full_name AS fullName,
        u.mobile_number AS mobileNumber,
        u.role AS currentRole,
        u.district_location AS districtLocation
      FROM role_change_requests r
      JOIN users u ON u.id = r.user_id
      ORDER BY (r.status = 'pending') DESC, r.created_at DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch role requests:', error.message);
    res.status(500).json({ message: 'Failed to fetch role requests' });
  }
});

app.post('/api/admin/role-requests/:requestId/respond', requireAdmin, async (req, res) => {
  const requestId = Number.parseInt(req.params.requestId, 10);
  const action = String(req.body.action || '').trim().toLowerCase();

  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ message: 'Invalid request id.' });
  }

  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Action must be accept or reject.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [requestRows] = await connection.query(
      `SELECT id, user_id, desired_role
       FROM role_change_requests
       WHERE id = ? AND status = 'pending'
       LIMIT 1`,
      [requestId]
    );

    if (requestRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pending request not found.' });
    }

    const requestRow = requestRows[0];

    if (action === 'reject') {
      await connection.query(
        `UPDATE role_change_requests
         SET status = 'rejected', responded_at = NOW(), reviewed_by = ?
         WHERE id = ?`,
        [req.session.userId, requestId]
      );
      await connection.commit();
      return res.json({ message: 'Role request rejected.' });
    }

    await connection.query(
      `UPDATE users
       SET role = ?, is_verified = CASE WHEN ? = 'Verified Expert' THEN 1 ELSE is_verified END
       WHERE id = ?`,
      [requestRow.desired_role, requestRow.desired_role, requestRow.user_id]
    );

    await connection.query(
      `UPDATE role_change_requests
       SET status = 'approved', responded_at = NOW(), reviewed_by = ?
       WHERE id = ?`,
      [req.session.userId, requestId]
    );

    await connection.commit();
    res.json({ message: 'Role request approved.' });
  } catch (error) {
    await connection.rollback();
    console.error('Failed to respond to role request:', error.message);
    res.status(500).json({ message: 'Failed to respond to role request' });
  } finally {
    connection.release();
  }
});

app.post('/api/admin/users/:userId/role', requireAdmin, async (req, res) => {
  const targetUserId = Number.parseInt(req.params.userId, 10);
  const dbRole = desiredRoleToDbRole(req.body.desiredRole);

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ message: 'Invalid user id.' });
  }

  if (!dbRole) {
    return res.status(400).json({ message: 'Desired role must be expert or seller.' });
  }

  try {
    const [result] = await db.query(
      `UPDATE users
       SET role = ?, is_verified = CASE WHEN ? = 'Verified Expert' THEN 1 ELSE is_verified END
       WHERE id = ?`,
      [dbRole, dbRole, targetUserId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await db.query(
      `UPDATE role_change_requests
       SET status = 'approved', responded_at = NOW(), reviewed_by = ?
       WHERE user_id = ? AND desired_role = ? AND status = 'pending'`,
      [req.session.userId, targetUserId, dbRole]
    );

    res.json({ message: 'User role updated successfully.' });
  } catch (error) {
    console.error('Failed to update user role by admin:', error.message);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

app.get('/api/admin/posts', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        p.id,
        p.text_content AS textContent,
        p.post_type AS postType,
        p.created_at AS createdAt,
        u.id AS userId,
        u.full_name AS fullName,
        u.role AS role,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS commentsCount
      FROM posts p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT 100`
    );

    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch admin posts:', error.message);
    res.status(500).json({ message: 'Failed to fetch admin posts' });
  }
});

app.get('/api/admin/comments', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        c.id,
        c.text_content AS textContent,
        c.created_at AS createdAt,
        c.post_id AS postId,
        u.id AS userId,
        u.full_name AS fullName
      FROM comments c
      JOIN users u ON u.id = c.user_id
      ORDER BY c.created_at DESC
      LIMIT 120`
    );

    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch admin comments:', error.message);
    res.status(500).json({ message: 'Failed to fetch admin comments' });
  }
});

app.get('/api/me/activity', requireAuth, async (req, res) => {
  const currentUserId = Number(req.session.userId);

  try {
    const [likedPosts] = await db.query(
      `SELECT
        p.id AS postId,
        p.post_type AS postType,
        p.text_content AS textContent,
        p.shared_news_title AS sharedNewsTitle,
        p.created_at AS postCreatedAt,
        u.id AS authorId,
        u.full_name AS authorName,
        pl.created_at AS likedAt
      FROM post_likes pl
      JOIN posts p ON p.id = pl.post_id AND p.is_active = TRUE
      JOIN users u ON u.id = p.user_id
      WHERE pl.user_id = ?
      ORDER BY pl.created_at DESC`,
      [currentUserId]
    );

    const [commentedPosts] = await db.query(
      `SELECT
        c.id AS commentId,
        c.text_content AS commentText,
        c.created_at AS commentedAt,
        p.id AS postId,
        p.post_type AS postType,
        p.text_content AS postText,
        p.shared_news_title AS sharedNewsTitle,
        u.id AS authorId,
        u.full_name AS authorName
      FROM comments c
      JOIN posts p ON p.id = c.post_id AND p.is_active = TRUE
      JOIN users u ON u.id = p.user_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC`,
      [currentUserId]
    );

    res.json({ likedPosts, commentedPosts });
  } catch (error) {
    console.error('Failed to fetch user activity:', error.message);
    res.status(500).json({ message: 'Failed to fetch activity' });
  }
});

app.get('/api/marketplace', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        m.id,
        m.product_title AS productTitle,
        m.description,
        m.price,
        m.category,
        m.location,
        m.image_path AS imagePath,
        m.quantity,
        m.unit,
        m.created_at AS createdAt,
        u.id AS sellerId,
        u.full_name AS sellerName,
        u.mobile_number AS sellerMobile,
        u.is_verified AS isVerifiedSeller
      FROM marketplace_ads m
      LEFT JOIN users u ON m.vendor_id = u.id
      WHERE m.is_active = TRUE
      ORDER BY m.created_at DESC`
    );

    let filteredRows = rows;
    const selectedCategory = req.query.category;
    if (selectedCategory && selectedCategory !== '') {
      filteredRows = rows.filter(item => item.category === selectedCategory);
    }
    res.json(filteredRows);
  } catch (error) {
    console.error('Failed to fetch marketplace ads:', error.message);
    res.status(500).json({ message: 'Failed to fetch marketplace ads' });
  }
});

// Weather Endpoint
app.get('/api/weather', async (req, res) => {
  const locations = [
    { name: 'Dhaka', lat: 23.8103, lon: 90.4125 },
    { name: 'Gazipur', lat: 23.9957, lon: 90.4152 },
    { name: 'Bogura', lat: 24.8465, lon: 89.3687 },
    { name: 'Rajshahi', lat: 24.3745, lon: 88.6042 },
    { name: 'Khulna', lat: 22.8456, lon: 89.5403 },
    { name: 'Chattogram', lat: 22.3569, lon: 91.7832 },
  ];

  const areaQuery = String(req.query.area || 'Dhaka').trim();
  const daysQuery = Number.parseInt(req.query.days, 10);
  const forecastDays = Number.isInteger(daysQuery) ? Math.min(Math.max(daysQuery, 7), 21) : 14;
  const selectedLocation = locations.find((location) => location.name.toLowerCase() === areaQuery.toLowerCase());

  if (!selectedLocation) {
    return res.status(400).json({
      message: 'Invalid area',
      availableAreas: locations.map((location) => location.name),
    });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${selectedLocation.lat}&longitude=${selectedLocation.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&forecast_days=${forecastDays}&timezone=Asia/Dhaka`;
    const response = await fetch(url);
    const json = await response.json();

    const conditions = {
      0: 'Clear',
      1: 'Mostly Clear',
      2: 'Partly Cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Foggy',
      51: 'Light Drizzle',
      53: 'Drizzle',
      55: 'Heavy Drizzle',
      61: 'Rainy',
      63: 'Heavy Rain',
      65: 'Very Heavy Rain',
      80: 'Light Showers',
      81: 'Showers',
      82: 'Heavy Showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with Hail',
      99: 'Thunderstorm with Hail',
    };

    const daily = json.daily || {};
    const forecast = (daily.time || []).map((date, index) => ({
      date,
      maxTemp: Math.round(daily.temperature_2m_max[index]),
      minTemp: Math.round(daily.temperature_2m_min[index]),
      condition: conditions[daily.weather_code[index]] || 'Variable',
      rainfall: daily.precipitation_sum[index] || 0,
      windSpeed: Math.round(daily.wind_speed_10m_max[index] || 0),
    }));

    const current = json.current || {};

    res.json({
      area: selectedLocation.name,
      days: forecastDays,
      generatedAt: new Date().toISOString(),
      availableAreas: locations.map((location) => location.name),
      current: {
        temperature: Math.round(current.temperature_2m || 0),
        condition: conditions[current.weather_code] || 'Variable',
        humidity: current.relative_humidity_2m || 0,
        windSpeed: Math.round(current.wind_speed_10m || 0),
        rainfall: current.precipitation || 0,
      },
      forecast,
    });
  } catch (error) {
    console.error('Weather API error:', error.message);
    const today = new Date();
    const fallbackForecast = Array.from({ length: forecastDays }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() + index);
      const isoDate = day.toISOString().slice(0, 10);
      return {
        date: isoDate,
        maxTemp: 30,
        minTemp: 23,
        condition: 'Partly Cloudy',
        rainfall: 2,
        windSpeed: 10,
      };
    });

    res.json({
      area: selectedLocation.name,
      days: forecastDays,
      generatedAt: new Date().toISOString(),
      availableAreas: locations.map((location) => location.name),
      current: {
        temperature: 27,
        condition: 'Partly Cloudy',
        humidity: 78,
        windSpeed: 10,
        rainfall: 2,
      },
      forecast: fallbackForecast,
    });
  }
});

// Agricultural News
app.get('/api/news', async (req, res) => {
  try {
    const limit = 10;
    const searchQuery = 'agriculture';
    const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(searchQuery)}&mode=ArtList&maxrecords=${limit}&format=json&sort=DateDesc`;

    try {
      let externalText = '';
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const externalResponse = await fetch(gdeltUrl);
        externalText = await externalResponse.text();

        if (!externalText.startsWith('Please limit requests')) {
          break;
        }

        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 5500));
        }
      }

      let externalJson = null;
      try {
        externalJson = JSON.parse(externalText);
      } catch (parseError) {
        throw new Error(`Non-JSON response from GDELT: ${externalText.slice(0, 120)}`);
      }

      const articles = Array.isArray(externalJson.articles) ? externalJson.articles : [];

      const externalRows = articles.map((article, index) => {
        const title = String(article.title || '').trim();
        const excerpt = String(article.seendate || '').trim();
        const sourceName = String(article.domain || article.sourcecountry || 'External Source').trim();
        const text = `${title} ${excerpt}`.toLowerCase();

        let mappedCategory = 'Market';
        if (text.includes('weather') || text.includes('rain') || text.includes('monsoon')) mappedCategory = 'Weather';
        else if (text.includes('seed')) mappedCategory = 'Seeds';
        else if (text.includes('pest') || text.includes('insect') || text.includes('disease')) mappedCategory = 'Pest Control';
        else if (text.includes('irrigation') || text.includes('water')) mappedCategory = 'Irrigation';
        else if (text.includes('technology') || text.includes('drone') || text.includes('iot')) mappedCategory = 'Technology';
        else if (text.includes('policy') || text.includes('ministry') || text.includes('government')) mappedCategory = 'Government';
        else if (text.includes('tip') || text.includes('guide') || text.includes('practice')) mappedCategory = 'Tips';

        return {
          id: `ext-${index + 1}`,
          title: title || 'Agricultural update',
          excerpt: excerpt || 'Latest agricultural update',
          category: mappedCategory,
          imageUrl: article.socialimage || null,
          source: sourceName,
          isFeatured: index < 2 ? 1 : 0,
          createdAt: article.seendate || new Date().toISOString(),
          url: article.url || null,
        };
      });

      if (externalRows.length > 0) {
        externalNewsCache = {
          rows: externalRows.slice(0, limit),
          cachedAt: Date.now(),
        };
        return res.json(externalRows.slice(0, limit));
      }
    } catch (externalError) {
      console.error('External news fetch failed:', externalError.message);

      // If the provider is rate-limited temporarily, serve recent cached API news.
      const cacheIsFresh = externalNewsCache.rows.length > 0 && (Date.now() - externalNewsCache.cachedAt) < (15 * 60 * 1000);
      if (cacheIsFresh) {
        return res.json(externalNewsCache.rows);
      }
    }

    // Fallback to local DB news if external feed is unavailable.
    const [rows] = await db.query(
      `SELECT
        id,
        title,
        excerpt,
        category,
        image_url AS imageUrl,
        source,
        is_featured AS isFeatured,
        created_at AS createdAt,
        NULL AS url
      FROM agricultural_news
      WHERE is_active = TRUE
      ORDER BY is_featured DESC, created_at DESC
      LIMIT ?`,
      [limit]
    );

    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch news:', error.message);
    res.status(500).json({ message: 'Failed to fetch news' });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Image must be 5MB or less' });
    }
    return res.status(400).json({ message: err.message });
  }

  if (err) {
    return res.status(400).json({ message: err.message || 'Request failed' });
  }

  next();
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
