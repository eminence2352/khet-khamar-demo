require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function upsertUser(connection, user) {
  const passwordHash = await bcrypt.hash(user.password || 'password123', 10);
  
  await connection.query(
    `INSERT INTO users (mobile_number, email, password_hash, full_name, role, district_location, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email = VALUES(email),
       password_hash = VALUES(password_hash),
       full_name = VALUES(full_name),
       role = VALUES(role),
       district_location = VALUES(district_location),
       is_verified = VALUES(is_verified),
       id = LAST_INSERT_ID(id)`,
    [
      user.mobile,
      user.email,
      passwordHash,
      user.name,
      user.role,
      user.location,
      user.verified,
    ]
  );

  const [rows] = await connection.query('SELECT LAST_INSERT_ID() AS id');
  return rows[0].id;
}

async function seed() {
  const useSsl = String(process.env.DB_SSL || '').trim().toLowerCase() === 'true';
  const parsedPort = Number.parseInt(process.env.DB_PORT || '', 10);
  const dbPort = Number.isFinite(parsedPort) ? parsedPort : 3306;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: dbPort,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  try {
    const users = [
      {
        mobile: '01700000001',
        email: 'normal@khetkhamar.com',
        name: 'Rahim Uddin',
        password: 'password123',
        role: 'Farmer',
        location: 'Dhaka',
        verified: false,
      },
      {
        mobile: '01700000002',
        email: 'expert@khetkhamar.com',
        name: 'Dr. Nusrat Rahman',
        password: 'expert123',
        role: 'Verified Expert',
        location: 'Gazipur',
        verified: true,
      },
      {
        mobile: '01700000003',
        email: 'seller@khetkhamar.com',
        name: 'Hasan Traders',
        password: 'seller123',
        role: 'General Vendor',
        location: 'Bogura',
        verified: false,
      },
      {
        mobile: '01700000004',
        email: 'admin@khetkhamar.com',
        name: 'System Admin',
        password: 'admin123',
        role: 'Admin',
        location: 'Dhaka',
        verified: true,
      },
      {
        mobile: '01700000005',
        email: 'farmer.jalal@khetkhamar.com',
        name: 'Jalal Mia',
        password: 'jalal123',
        role: 'Farmer',
        location: 'Mymensingh',
        verified: false,
      },
      {
        mobile: '01700000006',
        email: 'farmer.shirin@khetkhamar.com',
        name: 'Shirin Akter',
        password: 'shirin123',
        role: 'Farmer',
        location: 'Rangpur',
        verified: false,
      },
      {
        mobile: '01700000007',
        email: 'seller.kabir@khetkhamar.com',
        name: 'Kabir Agro Mart',
        password: 'kabir123',
        role: 'General Vendor',
        location: 'Jessore',
        verified: false,
      },
      {
        mobile: '01700000008',
        email: 'seller.rokeya@khetkhamar.com',
        name: 'Rokeya Seed House',
        password: 'rokeya123',
        role: 'General Vendor',
        location: 'Cumilla',
        verified: false,
      },
      {
        mobile: '01700000009',
        email: 'expert.aminul@khetkhamar.com',
        name: 'Aminul Haque',
        password: 'aminul123',
        role: 'Verified Expert',
        location: 'Rajshahi',
        verified: true,
      },
      {
        mobile: '01700000010',
        email: 'expert.tania@khetkhamar.com',
        name: 'Tania Sultana',
        password: 'tania123',
        role: 'Verified Expert',
        location: 'Sylhet',
        verified: true,
      },
      {
        mobile: '01700000011',
        email: 'farmer.nahid@khetkhamar.com',
        name: 'Nahid Hasan',
        password: 'nahid123',
        role: 'Farmer',
        location: 'Khulna',
        verified: false,
      },
      {
        mobile: '01700000012',
        email: 'farmer.rima@khetkhamar.com',
        name: 'Rima Khatun',
        password: 'rima123',
        role: 'Farmer',
        location: 'Barisal',
        verified: false,
      },
    ];

    const userIds = {};
    for (const user of users) {
      userIds[user.mobile] = await upsertUser(connection, user);
    }

    const connectionPairsByMobile = [
      ['01700000001', '01700000002'],
      ['01700000001', '01700000003'],
      ['01700000001', '01700000005'],
      ['01700000001', '01700000006'],
      ['01700000001', '01700000009'],
      ['01700000001', '01700000010'],
      ['01700000001', '01700000011'],
      ['01700000002', '01700000003'],
      ['01700000002', '01700000005'],
      ['01700000002', '01700000006'],
      ['01700000002', '01700000008'],
      ['01700000002', '01700000009'],
      ['01700000003', '01700000005'],
      ['01700000003', '01700000007'],
      ['01700000003', '01700000008'],
      ['01700000003', '01700000010'],
      ['01700000005', '01700000006'],
      ['01700000005', '01700000011'],
      ['01700000006', '01700000012'],
      ['01700000009', '01700000010'],
      ['01700000009', '01700000011'],
      ['01700000010', '01700000012'],
    ];

    for (const [mobileA, mobileB] of connectionPairsByMobile) {
      const userA = userIds[mobileA];
      const userB = userIds[mobileB];

      if (!userA || !userB || userA === userB) {
        continue;
      }

      const userOneId = Math.min(userA, userB);
      const userTwoId = Math.max(userA, userB);

      await connection.query(
        'INSERT IGNORE INTO connections (user_one_id, user_two_id) VALUES (?, ?)',
        [userOneId, userTwoId]
      );
    }

    console.log('Seeded sample connections for social graph.');

    const postTemplates = [
      'Prepared raised beds for okra today. Soil moisture is stable.',
      'Irrigated the paddy field early morning to reduce evaporation loss.',
      'Started compost tea application for chili plants this week.',
      'Neem oil spray helped reduce leaf curl in my brinjal plot.',
      'Transplanted tomato seedlings and added organic mulch.',
      'Received a fresh stock of certified rice seeds in my shop.',
      'Weather looks cloudy, planning light irrigation only.',
      'Tested drip line pressure. Uniform flow is much better now.',
      'Applied balanced NPK before flowering stage as advised.',
      'Field scouting found early pest signs, taking preventive measures.',
      'Seed germination rate is excellent this season.',
      'Using pheromone traps reduced insect pressure significantly.',
    ];

    const [postCountRows] = await connection.query('SELECT COUNT(*) AS total FROM posts');
    const existingPostsCount = Number(postCountRows[0].total) || 0;
    const minimumPosts = 22;
    const postsToAdd = Math.max(0, minimumPosts - existingPostsCount);

    const postUserIds = users
      .filter((user) => user.role !== 'Admin')
      .map((user) => userIds[user.mobile]);

    for (let index = 0; index < postsToAdd; index += 1) {
      const userId = postUserIds[index % postUserIds.length];
      const textContent = postTemplates[index % postTemplates.length];
      const likesCount = (index * 3) % 9;

      await connection.query(
        'INSERT INTO posts (user_id, text_content, likes_count) VALUES (?, ?, ?)',
        [userId, textContent, likesCount]
      );
    }

    if (postsToAdd > 0) {
      console.log(`Seeded ${postsToAdd} sample posts.`);
    } else {
      console.log('Posts already satisfy minimum sample count.');
    }

    const commentTemplates = [
      'Great update. Thanks for sharing this.',
      'Very useful tip, I will try this tomorrow.',
      'Can you share the exact dosage you used?',
      'This method worked well in my field too.',
      'Excellent result. Keep posting these updates.',
      'I noticed similar growth after using compost tea.',
      'What was the weather condition when you applied it?',
      'Nice practice, this helps small farmers a lot.',
      'I had pest issues too, this is a good approach.',
      'Thanks, this gave me confidence to try the same.',
    ];

    const [commentCountRows] = await connection.query('SELECT COUNT(*) AS total FROM comments');
    const existingCommentsCount = Number(commentCountRows[0].total) || 0;
    const minimumComments = 30;
    const commentsToAdd = Math.max(0, minimumComments - existingCommentsCount);

    const [postRows] = await connection.query(
      'SELECT id FROM posts WHERE is_active = TRUE ORDER BY id ASC LIMIT 80'
    );

    const commentUserIds = users
      .filter((user) => user.role !== 'Admin')
      .map((user) => userIds[user.mobile]);

    if (postRows.length > 0) {
      for (let index = 0; index < commentsToAdd; index += 1) {
        const commenterId = commentUserIds[index % commentUserIds.length];
        const postId = postRows[index % postRows.length].id;
        const textContent = commentTemplates[index % commentTemplates.length];

        await connection.query(
          'INSERT INTO comments (post_id, user_id, text_content) VALUES (?, ?, ?)',
          [postId, commenterId, textContent]
        );
      }
    }

    if (commentsToAdd > 0) {
      console.log(`Seeded ${commentsToAdd} sample comments.`);
    } else {
      console.log('Comments already satisfy minimum sample count.');
    }

    const [adsCountRows] = await connection.query('SELECT COUNT(*) AS total FROM marketplace_ads');
    if (adsCountRows[0].total === 0) {
      await connection.query(
        `INSERT INTO marketplace_ads (vendor_id, product_title, description, price, category, location, quantity, unit)
         VALUES
         (?, ?, ?, ?, ?, ?, ?, ?),
         (?, ?, ?, ?, ?, ?, ?, ?),
         (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userIds['01700000003'],
          'Premium Boro Rice Seed',
          'High germination rate seed suitable for current Boro season.',
          1200,
          'Seeds',
          'Gazipur',
          150,
          'kg',
          userIds['01700000003'],
          'Fresh Green Chili',
          'Freshly harvested green chili from Bogura farms.',
          140,
          'Produce',
          'Bogura',
          500,
          'kg',
          userIds['01700000003'],
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
      console.log('marketplace_ads table already has data, skipping ads seed.');
    }

    // Seed some sample reviews for Hasan Traders (vendor at mobile 01700000003)
    const hasanId = userIds['01700000003'];
    if (hasanId) {
      const [existingReviews] = await connection.query('SELECT COUNT(*) AS total FROM reviews WHERE seller_id = ?', [hasanId]);
      const existingCount = Number(existingReviews[0].total) || 0;
      if (existingCount === 0) {
        const reviewerMobiles = ['01700000001', '01700000005', '01700000006', '01700000011'];
        const reviewTexts = [
          'Very helpful seller, timely delivery and good packing.',
          'Seeds looked healthy and germinated well in my plot.',
          'Good communication and fair price. Recommended.',
          'Delivery was slightly delayed but product quality is excellent.'
        ];
        const ratings = [5, 5, 4, 4];

        const insertValues = [];
        for (let i = 0; i < reviewerMobiles.length; i += 1) {
          const buyerId = userIds[reviewerMobiles[i]];
          if (!buyerId) continue;
          insertValues.push([buyerId, hasanId, null, ratings[i], reviewTexts[i]]);
        }

        if (insertValues.length > 0) {
          // Prepare multi-row insert
          const placeholders = insertValues.map(() => '(?, ?, ?, ?, ?)').join(', ');
          const flat = insertValues.flat();
          await connection.query(`INSERT INTO reviews (buyer_id, seller_id, marketplace_ad_id, rating, review_text) VALUES ${placeholders}`, flat);
          console.log('Seeded sample reviews for Hasan Traders.');
        }
      } else {
        console.log('Reviews for Hasan Traders already exist, skipping reviews seed.');
      }
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
