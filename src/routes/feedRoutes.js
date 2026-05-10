// This file registers all feed-related API endpoints (posts, likes, comments)
const { createNotification } = require('../helpers/notifications');

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
    // Get the text content from the request body
    const { textContent, isHelpRequest } = req.body;
    const trimmedText = String(textContent || '').trim();
    const helpRequested = ['true', '1', 'yes', 'on'].includes(String(isHelpRequest || '').trim().toLowerCase());
    // Store the uploaded image path if one was provided
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    // A post must have either text OR an image (or both)
    if (!trimmedText && !imagePath) {
      return res.status(400).json({ message: 'textContent or image is required' });
    }

    try {
      // Insert the new post into the database
      const [result] = await db.query(
        'INSERT INTO posts (user_id, text_content, image_path) VALUES (?, ?, ?)',
        [req.session.userId, trimmedText || '', imagePath]
      );

      const postId = result.insertId;

      // Broadcast help-request notifications to all experts
      if (helpRequested && postId) {
        const [experts] = await db.query(
          `SELECT id
           FROM users
           WHERE role = 'Verified Expert'
             AND is_active = TRUE
             AND id <> ?`,
          [req.session.userId]
        );

        await Promise.all(
          experts.map((expert) => createNotification(db, {
            recipientId: expert.id,
            actorId: req.session.userId,
            type: 'help_request',
            postId,
          }))
        );
      }

      // Return success with the new post ID
      res.status(201).json({
        message: 'Post created successfully',
        postId,
        imagePath,
      });
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

      // Check if the post exists and is active
      const [postRows] = await connection.query(
        'SELECT id FROM posts WHERE id = ? AND is_active = TRUE LIMIT 1',
        [postId]
      );

      if (postRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Post not found.' });
      }

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

      const [ownerRows] = await connection.query('SELECT user_id FROM posts WHERE id = ? LIMIT 1', [postId]);
      if (ownerRows.length > 0) {
        await createNotification(connection, {
          recipientId: ownerRows[0].user_id,
          actorId: userId,
          type: 'post_like',
          postId,
        });
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

    try {
      // Verify the post exists and is active
      const [postRows] = await db.query('SELECT id FROM posts WHERE id = ? AND is_active = TRUE LIMIT 1', [postId]);
      if (postRows.length === 0) {
        return res.status(404).json({ message: 'Post not found.' });
      }

      // Insert the comment into the database
      const [result] = await db.query(
        `INSERT INTO comments (post_id, user_id, text_content)
         VALUES (?, ?, ?)`,
        [postId, userId, textContent]
      );

      const commentId = result.insertId;
      const [ownerRows] = await db.query('SELECT user_id FROM posts WHERE id = ? LIMIT 1', [postId]);
      if (ownerRows.length > 0) {
        await createNotification(db, {
          recipientId: ownerRows[0].user_id,
          actorId: userId,
          type: 'post_comment',
          postId,
          commentId,
        });
      }

      // Return success with the new comment ID
      res.status(201).json({ message: 'Comment added.', commentId });
    } catch (error) {
      console.error('Failed to add comment:', error.message);
      res.status(500).json({ message: 'Failed to add comment' });
    }
  });

  // ENDPOINT 6: PUT /api/posts/:postId - Edit a post (owner or admin only)
  app.put('/api/posts/:postId', requireAuth, async (req, res) => {
    const postId = Number.parseInt(req.params.postId, 10);
    const userId = Number(req.session.userId);
    const { textContent } = req.body;
    const trimmedText = String(textContent || '').trim();

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ message: 'Invalid post id.' });
    }

    if (!trimmedText) {
      return res.status(400).json({ message: 'Post text is required.' });
    }

    try {
      // Get post owner and role
      const [postRows] = await db.query('SELECT user_id FROM posts WHERE id = ? AND is_active = TRUE LIMIT 1', [postId]);
      if (postRows.length === 0) {
        return res.status(404).json({ message: 'Post not found.' });
      }

      const postOwnerId = postRows[0].user_id;
      
      // Get current user's role
      const [userRows] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [userId]);
      const userRole = userRows.length > 0 ? userRows[0].role : null;
      
      // Check if user is owner or admin
      const isOwner = userId === postOwnerId;
      const isAdmin = userRole === 'Admin';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: 'You cannot edit this post.' });
      }

      // Update the post
      await db.query('UPDATE posts SET text_content = ? WHERE id = ?', [trimmedText, postId]);
      res.json({ message: 'Post updated successfully.' });
    } catch (error) {
      console.error('Failed to edit post:', error.message);
      res.status(500).json({ message: 'Failed to edit post' });
    }
  });

  // ENDPOINT 7: DELETE /api/posts/:postId - Delete a post (owner or admin only)
  app.delete('/api/posts/:postId', requireAuth, async (req, res) => {
    const postId = Number.parseInt(req.params.postId, 10);
    const userId = Number(req.session.userId);

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ message: 'Invalid post id.' });
    }

    try {
      // Get post owner
      const [postRows] = await db.query('SELECT user_id FROM posts WHERE id = ? AND is_active = TRUE LIMIT 1', [postId]);
      if (postRows.length === 0) {
        return res.status(404).json({ message: 'Post not found.' });
      }

      const postOwnerId = postRows[0].user_id;
      
      // Get current user's role
      const [userRows] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [userId]);
      const userRole = userRows.length > 0 ? userRows[0].role : null;
      
      // Check if user is owner or admin
      const isOwner = userId === postOwnerId;
      const isAdmin = userRole === 'Admin';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: 'You cannot delete this post.' });
      }

      // Soft delete - mark as inactive
      await db.query('UPDATE posts SET is_active = FALSE WHERE id = ?', [postId]);
      res.json({ message: 'Post deleted successfully.' });
    } catch (error) {
      console.error('Failed to delete post:', error.message);
      res.status(500).json({ message: 'Failed to delete post' });
    }
  });

  // ENDPOINT 8: PUT /api/posts/:postId/comments/:commentId - Edit a comment (owner or admin only)
  app.put('/api/posts/:postId/comments/:commentId', requireAuth, async (req, res) => {
    const postId = Number.parseInt(req.params.postId, 10);
    const commentId = Number.parseInt(req.params.commentId, 10);
    const userId = Number(req.session.userId);
    const { textContent } = req.body;
    const trimmedText = String(textContent || '').trim();

    if (!Number.isInteger(postId) || postId <= 0 || !Number.isInteger(commentId) || commentId <= 0) {
      return res.status(400).json({ message: 'Invalid post or comment id.' });
    }

    if (!trimmedText) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    try {
      // Get comment owner
      const [commentRows] = await db.query('SELECT user_id FROM comments WHERE id = ? AND post_id = ? LIMIT 1', [commentId, postId]);
      if (commentRows.length === 0) {
        return res.status(404).json({ message: 'Comment not found.' });
      }

      const commentOwnerId = commentRows[0].user_id;
      
      // Get current user's role
      const [userRows] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [userId]);
      const userRole = userRows.length > 0 ? userRows[0].role : null;
      
      // Check if user is owner or admin
      const isOwner = userId === commentOwnerId;
      const isAdmin = userRole === 'Admin';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: 'You cannot edit this comment.' });
      }

      // Update the comment
      await db.query('UPDATE comments SET text_content = ? WHERE id = ?', [trimmedText, commentId]);
      res.json({ message: 'Comment updated successfully.' });
    } catch (error) {
      console.error('Failed to edit comment:', error.message);
      res.status(500).json({ message: 'Failed to edit comment' });
    }
  });

  // ENDPOINT 9: DELETE /api/posts/:postId/comments/:commentId - Delete a comment (owner or admin only)
  app.delete('/api/posts/:postId/comments/:commentId', requireAuth, async (req, res) => {
    const postId = Number.parseInt(req.params.postId, 10);
    const commentId = Number.parseInt(req.params.commentId, 10);
    const userId = Number(req.session.userId);

    if (!Number.isInteger(postId) || postId <= 0 || !Number.isInteger(commentId) || commentId <= 0) {
      return res.status(400).json({ message: 'Invalid post or comment id.' });
    }

    try {
      // Get comment owner
      const [commentRows] = await db.query('SELECT user_id FROM comments WHERE id = ? AND post_id = ? LIMIT 1', [commentId, postId]);
      if (commentRows.length === 0) {
        return res.status(404).json({ message: 'Comment not found.' });
      }

      const commentOwnerId = commentRows[0].user_id;
      
      // Get current user's role
      const [userRows] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [userId]);
      const userRole = userRows.length > 0 ? userRows[0].role : null;
      
      // Check if user is owner or admin
      const isOwner = userId === commentOwnerId;
      const isAdmin = userRole === 'Admin';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: 'You cannot delete this comment.' });
      }

      // Delete the comment
      await db.query('DELETE FROM comments WHERE id = ?', [commentId]);
      res.json({ message: 'Comment deleted successfully.' });
    } catch (error) {
      console.error('Failed to delete comment:', error.message);
      res.status(500).json({ message: 'Failed to delete comment' });
    }
  });
}

module.exports = registerFeedRoutes;
