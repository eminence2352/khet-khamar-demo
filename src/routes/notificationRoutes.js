// This file registers all notification-related API endpoints
function registerNotificationRoutes(app, { db, requireAuth }) {
  // ENDPOINT 1: GET /api/notifications - Fetch notifications for current user
  // Returns paginated notifications with actor details
  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const userId = Number(req.session.userId);
      const limit = Number.parseInt(req.query.limit, 10) || 20;
      const offset = Number.parseInt(req.query.offset, 10) || 0;

      // Fetch notifications for the current user with actor and post details
      const [rows] = await db.query(
        `SELECT
          n.id,
          n.notification_type AS notificationType,
          n.is_read AS isRead,
          n.created_at AS createdAt,
          n.post_id AS postId,
          n.comment_id AS commentId,
          u.id AS actorId,
          u.full_name AS actorName,
          u.profile_picture_path AS actorProfilePicture,
          p.user_id AS postOwnerId,
          p.text_content AS postContent,
          p.image_path AS postImage
         FROM notifications n
         LEFT JOIN users u ON n.actor_id = u.id
         LEFT JOIN posts p ON n.post_id = p.id
         WHERE n.recipient_id = ?
         ORDER BY n.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      // Get total count of unread notifications
      const [countRows] = await db.query(
        'SELECT COUNT(*) as unreadCount FROM notifications WHERE recipient_id = ? AND is_read = FALSE',
        [userId]
      );

      res.json({
        notifications: rows,
        unreadCount: countRows[0]?.unreadCount || 0,
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error.message);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  // ENDPOINT 2: POST /api/notifications/:id/read - Mark a single notification as read
  app.post('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const notificationId = Number.parseInt(req.params.id, 10);
      const userId = Number(req.session.userId);

      if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return res.status(400).json({ message: 'Invalid notification id.' });
      }

      // Verify the notification belongs to the current user
      const [rows] = await db.query(
        'SELECT id FROM notifications WHERE id = ? AND recipient_id = ?',
        [notificationId, userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: 'Notification not found.' });
      }

      // Mark the notification as read
      await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [notificationId]);

      // Get updated unread count
      const [countRows] = await db.query(
        'SELECT COUNT(*) as unreadCount FROM notifications WHERE recipient_id = ? AND is_read = FALSE',
        [userId]
      );

      res.json({
        message: 'Notification marked as read.',
        unreadCount: countRows[0]?.unreadCount || 0,
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error.message);
      res.status(500).json({ message: 'Failed to update notification' });
    }
  });

  // ENDPOINT 3: POST /api/notifications/read-all - Mark all notifications as read
  app.post('/api/notifications/read-all', requireAuth, async (req, res) => {
    try {
      const userId = Number(req.session.userId);

      // Mark all notifications for current user as read
      await db.query('UPDATE notifications SET is_read = TRUE WHERE recipient_id = ? AND is_read = FALSE', [userId]);

      res.json({
        message: 'All notifications marked as read.',
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error.message);
      res.status(500).json({ message: 'Failed to update notifications' });
    }
  });
}

module.exports = registerNotificationRoutes;
