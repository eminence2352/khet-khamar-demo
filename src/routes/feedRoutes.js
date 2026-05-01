// This file registers all feed-related API endpoints (posts, likes, comments)
function registerFeedRoutes(app, { db, upload, requireAuth }) {
  // ENDPOINT 1: GET /api/posts - Fetch feed posts for current user
  // Optionally filter by a specific user ID if provided in query params
  app.get('/api/posts', async (req, res) => {
    try {
      // Get optional user ID filter from query params
      const requestedUserId = Number.parseInt(req.query.userId, 10);
      const hasUserFilter = Number.isInteger(requestedUserId) && requestedUserId > 0;
      const currentUserId = Number(req.session.userId) || 0;

      // Build the SQL query to fetch posts with like count, comment count, and whether current user liked it
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

      // If filtering by a specific user, add that condition
      if (hasUserFilter) {
        sql += ' AND p.user_id = ?';
        params.push(requestedUserId);
      }

      // Always return newest posts first
      sql += ' ORDER BY p.created_at DESC';

      // Execute query and return posts
      const [rows] = await db.query(sql, params);
      res.json(rows);
    } catch (error) {
      console.error('Failed to fetch posts:', error.message);
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  });

  // ENDPOINT 2: POST /api/posts - Create a new post
  // Requires authentication, accepts optional image upload
  app.post('/api/posts', requireAuth, upload.single('image'), async (req, res) => {
    // Get the text content and help request flag from the request body
    const { textContent, isHelpRequest } = req.body;
    const trimmedText = String(textContent || '').trim();
    // Store the uploaded image path if one was provided
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    // Convert isHelpRequest to boolean (default false)
    const isHelp = Boolean(isHelpRequest === true || isHelpRequest === 'true');

    // A post must have either text OR an image (or both)
    if (!trimmedText && !imagePath) {
      return res.status(400).json({ message: 'textContent or image is required' });
    }

    try {
      // Get a dedicated database connection for transaction support
      const connection = await db.getConnection();
      try {
        // Start a transaction to ensure post and notifications are created together
        await connection.beginTransaction();

        // Insert the new post into the database
        const [result] = await connection.query(
          'INSERT INTO posts (user_id, text_content, image_path, is_help_request) VALUES (?, ?, ?, ?)',
          [req.session.userId, trimmedText || '', imagePath, isHelp ? 1 : 0]
        );

        const postId = result.insertId;

        // If this is a help request, create notifications for all verified experts
        if (isHelp) {
          // Get all verified experts
          const [experts] = await connection.query(
            "SELECT id FROM users WHERE role = 'Verified Expert' AND is_active = TRUE AND id != ?",
            [req.session.userId]
          );

          // Create notifications for each expert
          if (experts.length > 0) {
            const notificationPromises = experts.map((expert) =>
              connection.query(
                'INSERT INTO notifications (recipient_id, actor_id, notification_type, post_id) VALUES (?, ?, ?, ?)',
                [expert.id, req.session.userId, 'help_request', postId]
              )
            );
            await Promise.all(notificationPromises);
          }
        }

        // Commit all changes atomically
        await connection.commit();

        // Return success with the new post ID
        res.status(201).json({
          message: 'Post created successfully',
          postId,
          imagePath,
        });
      } catch (error) {
        // If any error occurs, undo all database changes
        await connection.rollback();
        throw error;
      } finally {
        // Always release the connection back to the pool
        connection.release();
      }
    } catch (error) {
      console.error('Failed to create post:', error.message);
      res.status(500).json({ message: 'Failed to create post' });
    }
  });

  // ENDPOINT 3: POST /api/posts/:postId/like - Toggle like status for a post
  // Uses database transactions to ensure consistency
  app.post('/api/posts/:postId/like', requireAuth, async (req, res) => {
    // Parse and validate the post ID from the URL
    const postId = Number.parseInt(req.params.postId, 10);
    const userId = Number(req.session.userId);

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ message: 'Invalid post id.' });
    }

    // Get a dedicated database connection for transaction support
    const connection = await db.getConnection();
    try {
      // Start a transaction - this ensures all operations succeed or fail together
      await connection.beginTransaction();

      // Check if the post exists and is active, and get the post owner
      const [postRows] = await connection.query(
        'SELECT id, user_id FROM posts WHERE id = ? AND is_active = TRUE LIMIT 1',
        [postId]
      );

      if (postRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Post not found.' });
      }

      const postOwnerId = postRows[0].user_id;

      // Check if the current user already likes this post
      const [existingRows] = await connection.query(
        'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1',
        [postId, userId]
      );

      // If already liked, remove the like (toggle to unlike)
      if (existingRows.length > 0) {
        await connection.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
        await connection.query('UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?', [postId]);
        await connection.commit();
        return res.json({ message: 'Post unliked.', liked: false });
      }

      // If not yet liked, add the like (toggle to like)
      await connection.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
      await connection.query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [postId]);

      // Create notification for the post owner (only if they're not the one liking)
      if (postOwnerId !== userId) {
        await connection.query(
          'INSERT INTO notifications (recipient_id, actor_id, notification_type, post_id) VALUES (?, ?, ?, ?)',
          [postOwnerId, userId, 'like', postId]
        );
      }

      // Commit all changes atomically
      await connection.commit();
      res.status(201).json({ message: 'Post liked.', liked: true });
    } catch (error) {
      // If any error occurs, undo all database changes
      await connection.rollback();
      console.error('Failed to toggle post like:', error.message);
      res.status(500).json({ message: 'Failed to update like' });
    } finally {
      // Always release the connection back to the pool
      connection.release();
    }
  });

  // ENDPOINT 4: GET /api/posts/:postId/comments - Fetch comments for a post
  app.get('/api/posts/:postId/comments', async (req, res) => {
    const postId = Number.parseInt(req.params.postId, 10);

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ message: 'Invalid post id.' });
    }

    try {
      const [postRows] = await db.query('SELECT id FROM posts WHERE id = ? AND is_active = TRUE LIMIT 1', [postId]);
      if (postRows.length === 0) {
        return res.status(404).json({ message: 'Post not found.' });
      }

      const [rows] = await db.query(
        `SELECT
          c.id,
          c.post_id AS postId,
          c.user_id AS userId,
          c.text_content AS textContent,
          c.created_at AS createdAt,
          u.full_name AS userName
         FROM comments c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.post_id = ?
         ORDER BY c.created_at ASC`,
        [postId]
      );

      res.json(rows);
    } catch (error) {
      console.error('Failed to fetch comments:', error.message);
      res.status(500).json({ message: 'Failed to fetch comments' });
    }
  });

  // ENDPOINT 5: POST /api/posts/:postId/comments - Add a comment to a post
  app.post('/api/posts/:postId/comments', requireAuth, async (req, res) => {
    // Parse and validate the post ID
    const postId = Number.parseInt(req.params.postId, 10);
    const userId = Number(req.session.userId);
    // Get and trim the comment text
    const textContent = String(req.body.textContent || '').trim();

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ message: 'Invalid post id.' });
    }

    // Comment text is required
    if (!textContent) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    // Get a dedicated database connection for transaction support
    const connection = await db.getConnection();
    try {
      // Start a transaction - this ensures comment and notification are created together
      await connection.beginTransaction();

      // Verify the post exists and is active, and get the post owner
      const [postRows] = await connection.query('SELECT id, user_id FROM posts WHERE id = ? AND is_active = TRUE LIMIT 1', [postId]);
      if (postRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Post not found.' });
      }

      const postOwnerId = postRows[0].user_id;

      // Insert the comment into the database
      const [result] = await connection.query(
        `INSERT INTO comments (post_id, user_id, text_content)
         VALUES (?, ?, ?)`,
        [postId, userId, textContent]
      );

      const commentId = result.insertId;

      // Create notification for the post owner (only if they're not the one commenting)
      if (postOwnerId !== userId) {
        await connection.query(
          'INSERT INTO notifications (recipient_id, actor_id, notification_type, post_id, comment_id) VALUES (?, ?, ?, ?, ?)',
          [postOwnerId, userId, 'comment', postId, commentId]
        );
      }

      // Commit all changes atomically
      await connection.commit();

      // Return success with the new comment ID
      res.status(201).json({ message: 'Comment added.', commentId });
    } catch (error) {
      // If any error occurs, undo all database changes
      await connection.rollback();
      console.error('Failed to add comment:', error.message);
      res.status(500).json({ message: 'Failed to add comment' });
    } finally {
      // Always release the connection back to the pool
      connection.release();
    }
  });
}

module.exports = registerFeedRoutes;
