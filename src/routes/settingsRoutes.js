const bcrypt = require('bcryptjs');

function registerSettingsRoutes(app, { db, requireAuth, desiredRoleToDbRole }) {
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
      const [rows] = await db.query('SELECT id, password_hash FROM users WHERE id = ? LIMIT 1', [req.session.userId]);

      if (rows.length === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect.' });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, req.session.userId]);

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
}

module.exports = registerSettingsRoutes;
