require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

async function setupDatabase() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
  });

  try {
    // Create database
    await conn.query('CREATE DATABASE IF NOT EXISTS khet_khamar_db');
    console.log('Database created');

    // Select database
    await conn.changeUser({ database: process.env.DB_NAME });

    // Read and execute schema.sql
    const schema = fs.readFileSync('./schema.sql', 'utf8');
    const statements = schema.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      try {
        await conn.query(statement + ';');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('Error executing:', statement.substring(0, 50), error.message);
        }
      }
    }

    console.log('Schema created successfully');
    await conn.end();
  } catch (error) {
    console.error('Database setup error:', error.message);
    process.exit(1);
  }
}

setupDatabase();
