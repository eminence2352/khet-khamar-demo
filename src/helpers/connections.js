function normalizeConnectionPair(userA, userB) {
  return userA < userB ? [userA, userB] : [userB, userA];
}

function createConnectionHelpers(db) {
  async function getConnectionRelation(currentUserId, targetUserId) {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      return { status: 'self', pendingRequestId: null };
    }

    const [firstUserId, secondUserId] = normalizeConnectionPair(currentUserId, targetUserId);
    const [connectedRows] = await db.query(
      `SELECT id
       FROM connections
       WHERE user_one_id = ? AND user_two_id = ?
       LIMIT 1`,
      [firstUserId, secondUserId]
    );

    if (connectedRows.length > 0) {
      return { status: 'connected', pendingRequestId: null };
    }

    const [pendingRows] = await db.query(
      `SELECT id, sender_id
       FROM connection_requests
       WHERE status = 'pending'
         AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       ORDER BY created_at DESC
       LIMIT 1`,
      [currentUserId, targetUserId, targetUserId, currentUserId]
    );

    if (pendingRows.length === 0) {
      return { status: 'none', pendingRequestId: null };
    }

    const pendingRow = pendingRows[0];
    if (pendingRow.sender_id === currentUserId) {
      return { status: 'outgoing_pending', pendingRequestId: pendingRow.id };
    }

    return { status: 'incoming_pending', pendingRequestId: pendingRow.id };
  }

  return { getConnectionRelation };
}

module.exports = {
  normalizeConnectionPair,
  createConnectionHelpers,
};
