// Import MySQL2 module for database connections
const mysql = require('mysql2');

// This function creates a MySQL connection pool
function createDatabase() {
  const useSsl = String(process.env.DB_SSL || '').trim().toLowerCase() === 'true';
  const parsedPort = Number.parseInt(process.env.DB_PORT || '', 10);
  const dbPort = Number.isFinite(parsedPort) ? parsedPort : 3306;

  // Create a pool of database connections (reuses connections for efficiency)
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: dbPort,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    waitForConnections: true,
    connectionLimit: 10, // Max 10 simultaneous connections
    queueLimit: 0,
  });

  // Test the connection when the server starts
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Database connection failed:', err.message);
      return;
    }
    console.log('MySQL database connected successfully.');
    connection.release();
  });

  // Return the pool and its promise-based interface
  return { pool, db: pool.promise() };
}

module.exports = createDatabase;
