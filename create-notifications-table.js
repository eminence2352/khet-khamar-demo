require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_id INT NOT NULL,
        actor_id INT NOT NULL,
        notification_type VARCHAR(50) NOT NULL,
        post_id INT DEFAULT NULL,
        comment_id INT DEFAULT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_notifications_recipient_id FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_notifications_actor_id FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_notifications_post_id FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        CONSTRAINT fk_notifications_comment_id FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        KEY idx_notifications_recipient_read_created (recipient_id, is_read, created_at),
        KEY idx_notifications_actor_created (actor_id, created_at),
        KEY idx_notifications_post_created (post_id, created_at),
        KEY idx_notifications_comment_created (comment_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('notifications table ensured');
  } catch (error) {
    console.error('Failed to create notifications table:', error.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

run();