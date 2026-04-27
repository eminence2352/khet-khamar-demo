function registerFeedRoutes(app, { db, upload, requireAuth }) {
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
      const [result] = await db.query(
        'INSERT INTO posts (user_id, text_content, image_path) VALUES (?, ?, ?)',
        [req.session.userId, trimmedText || '', imagePath]
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
        await connection.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
        await connection.query('UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?', [postId]);
        await connection.commit();
        return res.json({ message: 'Post unliked.', liked: false });
      }

      await connection.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
      await connection.query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [postId]);

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
      const [postRows] = await db.query('SELECT id FROM posts WHERE id = ? AND is_active = TRUE LIMIT 1', [postId]);
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
}

module.exports = registerFeedRoutes;
