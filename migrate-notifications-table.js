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
      ALTER TABLE notifications
      MODIFY notification_type VARCHAR(50) NOT NULL
    `);

    await conn.query(`
      UPDATE notifications
      SET notification_type = CASE notification_type
        WHEN 'like' THEN 'post_like'
        WHEN 'comment' THEN 'post_comment'
        WHEN 'help_request' THEN 'help_request'
        ELSE notification_type
      END
    `);

    console.log('notifications table migrated');
  } catch (error) {
    console.error('Failed to migrate notifications table:', error.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

run();
