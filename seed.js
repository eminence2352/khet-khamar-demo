require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function upsertUser(connection, user) {
  const passwordHash = await bcrypt.hash(user.password || 'password123', 10);
  
  await connection.query(
    `INSERT INTO Users (mobile_number, email, password_hash, full_name, role, preferred_language, district_location, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email = VALUES(email),
       password_hash = VALUES(password_hash),
       full_name = VALUES(full_name),
       role = VALUES(role),
       preferred_language = VALUES(preferred_language),
       district_location = VALUES(district_location),
       is_verified = VALUES(is_verified),
       id = LAST_INSERT_ID(id)`,
    [
      user.mobile,
      user.email,
      passwordHash,
      user.name,
      user.role,
      user.language,
      user.location,
      user.verified,
    ]
  );

  const [rows] = await connection.query('SELECT LAST_INSERT_ID() AS id');
  return rows[0].id;
}

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    const users = [
      {
        mobile: '01700000001',
        email: 'demo@khetkhmar.com',
        name: 'Khet-Khamar Demo User',
        password: 'password123',
        role: 'Farmer',
        language: 'en',
        location: 'Dhaka',
        verified: false,
      },
      {
        mobile: '01712345678',
        email: 'jamil@traders.com',
        name: 'Jamil Traders',
        password: 'jamil123',
        role: 'Verified Vendor',
        language: 'bn',
        location: 'Gazipur',
        verified: true,
      },
      {
        mobile: '01787654321',
        email: 'mitali@agro.com',
        name: 'Mitali Agro',
        password: 'mitali123',
        role: 'General Vendor',
        language: 'bn',
        location: 'Bogura',
        verified: false,
      },
      {
        mobile: '01799887766',
        email: 'hasan@tools.com',
        name: 'Hasan Tools Corner',
        password: 'hasan123',
        role: 'General Vendor',
        language: 'en',
        location: 'Dhaka',
        verified: false,
      },
    ];

    const userIds = {};
    for (const user of users) {
      userIds[user.mobile] = await upsertUser(connection, user);
    }

    const [postCountRows] = await connection.query('SELECT COUNT(*) AS total FROM Posts');
    if (postCountRows[0].total === 0) {
      await connection.query(
        `INSERT INTO Posts (user_id, text_content, likes_count)
         VALUES
         (?, ?, ?),
         (?, ?, ?),
         (?, ?, ?)`,
        [
          userIds['01700000001'],
          'Just prepared seedbeds for summer vegetables. Soil moisture looks good this week.',
          3,
          userIds['01700000001'],
          'Testing drip irrigation in one plot to reduce water use.',
          5,
          userIds['01712345678'],
          'New stock of high-germination rice seed available now.',
          2,
        ]
      );
      console.log('Seeded sample posts.');
    } else {
      console.log('Posts table already has data, skipping post seed.');
    }

    const [adsCountRows] = await connection.query('SELECT COUNT(*) AS total FROM Marketplace_Ads');
    if (adsCountRows[0].total === 0) {
      await connection.query(
        `INSERT INTO Marketplace_Ads (vendor_id, product_title, description, price, category, location, quantity, unit)
         VALUES
         (?, ?, ?, ?, ?, ?, ?, ?),
         (?, ?, ?, ?, ?, ?, ?, ?),
         (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userIds['01712345678'],
          'Premium Boro Rice Seed',
          'High germination rate seed suitable for current Boro season.',
          1200,
          'Seeds',
          'Gazipur',
          150,
          'kg',
          userIds['01787654321'],
          'Fresh Green Chili',
          'Freshly harvested green chili from Bogura farms.',
          140,
          'Produce',
          'Bogura',
          500,
          'kg',
          userIds['01799887766'],
          'Sprayer Machine (16L)',
          'Durable hand sprayer suitable for regular field work.',
          3200,
          'Tools',
          'Dhaka',
          25,
          'piece',
        ]
      );
      console.log('Seeded sample marketplace ads.');
    } else {
      console.log('Marketplace_Ads table already has data, skipping ads seed.');
    }

    console.log('Database seeding complete.');
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error('Seeding failed:', error.message);
  process.exit(1);
});
