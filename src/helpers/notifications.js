async function createNotification(db, {
  recipientId,
  actorId,
  type,
  postId = null,
  commentId = null,
}) {
  const safeRecipientId = Number(recipientId);
  const safeActorId = Number(actorId);

  if (!Number.isInteger(safeRecipientId) || safeRecipientId <= 0) {
    return false;
  }

  if (!Number.isInteger(safeActorId) || safeActorId <= 0) {
    return false;
  }

  if (safeRecipientId === safeActorId) {
    return false;
  }

  const fallbackType = commentId ? 'post_comment' : postId ? 'post_like' : 'general_notification';
  const notificationType = String(type || '').trim() || fallbackType;

  try {
    await db.query(
      `INSERT INTO notifications (
        recipient_id,
        actor_id,
        notification_type,
        post_id,
        comment_id,
        is_read
      ) VALUES (?, ?, ?, ?, ?, FALSE)`,
      [safeRecipientId, safeActorId, notificationType, postId || null, commentId || null]
    );
    return true;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return false;
  }
}

module.exports = { createNotification };