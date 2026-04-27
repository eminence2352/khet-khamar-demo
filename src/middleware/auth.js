function createAuthMiddleware(db) {
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
      const [rows] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [req.session.userId]);

      if (rows.length === 0 || rows[0].role !== 'Admin') {
        return res.status(403).json({ message: 'Admin access required.' });
      }

      next();
    } catch (error) {
      console.error('Failed to verify admin access:', error.message);
      res.status(500).json({ message: 'Failed to verify admin access' });
    }
  };

  return { requireAuth, requireAdmin };
}

module.exports = createAuthMiddleware;
