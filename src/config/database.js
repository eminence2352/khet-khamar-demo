const mysql = require('mysql2');

function createDatabase() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Database connection failed:', err.message);
      return;
    }
    console.log('MySQL database connected successfully.');
    connection.release();
  });

  return { pool, db: pool.promise() };
}

module.exports = createDatabase;
