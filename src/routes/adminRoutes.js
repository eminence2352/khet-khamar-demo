function registerAdminRoutes(app, {
  db,
  requireAdmin,
  desiredAdminRoleToDbRole,
}) {
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
         SET role = ?, is_verified = CASE WHEN ? = 'Verified Expert' THEN 1 ELSE 0 END
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
    const dbRole = desiredAdminRoleToDbRole(req.body.desiredRole);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    if (!dbRole) {
      return res.status(400).json({ message: 'Desired role must be expert, seller, or farmer.' });
    }

    try {
      const [result] = await db.query(
        `UPDATE users
         SET role = ?, is_verified = CASE WHEN ? = 'Verified Expert' THEN 1 ELSE 0 END
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

  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    const rawSearch = String(req.query.search || '').trim();
    const roleFilter = String(req.query.role || '').trim();
    const likeSearch = `%${rawSearch}%`;

    try {
      const [rows] = await db.query(
        `SELECT
          u.id,
          u.full_name AS fullName,
          u.mobile_number AS mobileNumber,
          u.email,
          u.role,
          u.district_location AS districtLocation,
          u.is_verified AS isVerified,
          u.created_at AS createdAt
        FROM users u
        WHERE
          (? = '' OR u.full_name LIKE ? OR u.mobile_number LIKE ? OR u.email LIKE ?)
          AND (? = '' OR u.role = ?)
        ORDER BY u.created_at DESC
        LIMIT 250`,
        [rawSearch, likeSearch, likeSearch, likeSearch, roleFilter, roleFilter]
      );

      res.json(rows);
    } catch (error) {
      console.error('Failed to fetch admin users:', error.message);
      res.status(500).json({ message: 'Failed to fetch admin users' });
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
}

module.exports = registerAdminRoutes;
