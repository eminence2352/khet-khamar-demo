// This file registers notification endpoints for the social feed inbox
function registerNotificationRoutes(app, { db, requireAuth }) {
  app.get('/api/notifications', requireAuth, async (req, res) => {
    const userId = Number(req.session.userId);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(Number.isInteger(requestedLimit) ? requestedLimit : 10, 1), 20);

    try {
      const [countRows] = await db.query(
        'SELECT COUNT(*) AS unreadCount FROM notifications WHERE recipient_id = ? AND is_read = FALSE',
        [userId]
      );

      const [rows] = await db.query(
        `SELECT
          n.id,
          n.notification_type AS notificationType,
          n.post_id AS postId,
          n.comment_id AS commentId,
          n.is_read AS isRead,
          n.created_at AS createdAt,
          actor.id AS actorId,
          actor.full_name AS actorName,
          actor.role AS actorRole,
          actor.profile_picture_path AS actorProfilePicture,
          posts.text_content AS postText,
          comments.text_content AS commentText
         FROM notifications n
         LEFT JOIN users actor ON actor.id = n.actor_id
         LEFT JOIN posts ON posts.id = n.post_id
         LEFT JOIN comments ON comments.id = n.comment_id
         WHERE n.recipient_id = ?
         ORDER BY n.created_at DESC
         LIMIT ?`,
        [userId, limit]
      );

      res.json({
        unreadCount: Number(countRows[0]?.unreadCount) || 0,
        notifications: rows,
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error.message);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.post('/api/notifications/:notificationId/read', requireAuth, async (req, res) => {
    const notificationId = Number.parseInt(req.params.notificationId, 10);
    const userId = Number(req.session.userId);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ message: 'Invalid notification id.' });
    }

    try {
      const [result] = await db.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = ? AND recipient_id = ?',
        [notificationId, userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Notification not found.' });
      }

      const [countRows] = await db.query(
        'SELECT COUNT(*) AS unreadCount FROM notifications WHERE recipient_id = ? AND is_read = FALSE',
        [userId]
      );

      res.json({ message: 'Notification marked as read.', unreadCount: Number(countRows[0]?.unreadCount) || 0 });
    } catch (error) {
      console.error('Failed to mark notification as read:', error.message);
      res.status(500).json({ message: 'Failed to update notification' });
    }
  });

  app.post('/api/notifications/read-all', requireAuth, async (req, res) => {
    const userId = Number(req.session.userId);

    try {
      await db.query(
        'UPDATE notifications SET is_read = TRUE WHERE recipient_id = ? AND is_read = FALSE',
        [userId]
      );

      res.json({ message: 'All notifications marked as read.', unreadCount: 0 });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error.message);
      res.status(500).json({ message: 'Failed to update notifications' });
    }
  });
}

module.exports = registerNotificationRoutes;
