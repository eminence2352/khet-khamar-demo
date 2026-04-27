function registerProfileRoutes(app, {
  db,
  requireAuth,
  getConnectionRelation,
  normalizeConnectionPair,
  isExpertRole,
}) {
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
        const [viewerRows] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [currentUserId]);
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
      const [roleRows] = await db.query('SELECT id, role FROM users WHERE id IN (?, ?)', [followerId, expertId]);

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

      await db.query('INSERT INTO follows (follower_id, expert_id) VALUES (?, ?)', [followerId, expertId]);
      res.status(201).json({ message: 'Now following expert.', following: true });
    } catch (error) {
      console.error('Failed to update follow:', error.message);
      res.status(500).json({ message: 'Failed to update follow' });
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
}

module.exports = registerProfileRoutes;
