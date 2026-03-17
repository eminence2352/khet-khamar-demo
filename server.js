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
    'SELECT id FROM Users WHERE id = ? LIMIT 1',
    [preferredId]
  );

  if (preferredUserRows.length > 0) {
    return preferredUserRows[0].id;
  }

  const [existingUsers] = await db.query('SELECT id FROM Users ORDER BY id ASC LIMIT 1');
  if (existingUsers.length > 0) {
    return existingUsers[0].id;
  }

  const [insertResult] = await db.query(
    `INSERT INTO Users (mobile_number, password_hash, full_name, district_location, preferred_language)
     VALUES (?, ?, ?, ?, ?)`,
    ['01700000001', 'prototype_password_hash', 'Khet-Khamar Demo User', 'Dhaka', 'en']
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
  next();
};

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
      'SELECT id FROM Users WHERE mobile_number = ? OR email = ? LIMIT 1',
      [mobile_number, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Mobile number or email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user
    const [result] = await db.query(
      `INSERT INTO Users (mobile_number, email, password_hash, full_name, district_location, preferred_language)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [mobile_number, email, passwordHash, full_name, district_location, 'en']
    );

    const userId = result.insertId;

    // Set session
    req.session.userId = userId;

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
      'SELECT id, password_hash, full_name, email FROM Users WHERE mobile_number = ? LIMIT 1',
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

    // Set session
    req.session.userId = user.id;

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

// Get current user
app.get('/api/auth/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const [users] = await db.query(
      'SELECT id, mobile_number, email, full_name, district_location, profile_picture_path, bio FROM Users WHERE id = ? LIMIT 1',
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
  res.json({ authenticated: !!req.session.userId, userId: req.session.userId });
});

app.get('/api/status', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.get('/api/posts', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        p.id,
        p.user_id AS userId,
        p.text_content AS textContent,
        p.image_path AS imagePath,
        p.likes_count AS likesCount,
        p.created_at AS createdAt,
        u.full_name AS userName
      FROM Posts p
      LEFT JOIN Users u ON p.user_id = u.id
      WHERE p.is_active = TRUE
      ORDER BY p.created_at DESC`
    );

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
      'INSERT INTO Posts (user_id, text_content, image_path) VALUES (?, ?, ?)',
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
      FROM Marketplace_Ads m
      LEFT JOIN Users u ON m.vendor_id = u.id
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
      FROM Agricultural_News
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
