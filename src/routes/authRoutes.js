const bcrypt = require('bcryptjs');

function registerAuthRoutes(app, { db }) {
  app.post('/api/auth/signup', async (req, res) => {
    const { mobile_number, email, password, full_name, district_location } = req.body;

    if (!mobile_number || !email || !password || !full_name || !district_location) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    try {
      const [existingUsers] = await db.query(
        'SELECT id FROM users WHERE mobile_number = ? OR email = ? LIMIT 1',
        [mobile_number, email]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({ message: 'Mobile number or email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const [result] = await db.query(
        `INSERT INTO users (mobile_number, email, password_hash, full_name, district_location)
         VALUES (?, ?, ?, ?, ?)`,
        [mobile_number, email, passwordHash, full_name, district_location]
      );

      const userId = result.insertId;
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

  app.post('/api/auth/login', async (req, res) => {
    const { mobile_number, password } = req.body;

    if (!mobile_number || !password) {
      return res.status(400).json({ message: 'Mobile number and password are required' });
    }

    try {
      const [users] = await db.query(
        'SELECT id, password_hash, full_name, email, role FROM users WHERE mobile_number = ? LIMIT 1',
        [mobile_number]
      );

      if (users.length === 0) {
        return res.status(401).json({ message: 'Invalid mobile number or password' });
      }

      const user = users[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid mobile number or password' });
      }

      if (user.role === 'Admin') {
        return res.status(403).json({ message: 'Admin must login from admin login page.' });
      }

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

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logout successful' });
    });
  });

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
}

module.exports = registerAuthRoutes;
