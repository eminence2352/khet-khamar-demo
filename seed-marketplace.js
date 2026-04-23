require('dotenv').config();
const mysql = require('mysql2/promise');

async function seedMarketplace() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    const [vendors] = await connection.query(
      `SELECT id, mobile_number
       FROM users
       WHERE mobile_number IN (?, ?, ?)` ,
      ['01712345678', '01787654321', '01799887766']
    );

    const vendorIdByMobile = vendors.reduce((acc, row) => {
      acc[row.mobile_number] = row.id;
      return acc;
    }, {});

    if (!vendorIdByMobile['01712345678'] || !vendorIdByMobile['01787654321'] || !vendorIdByMobile['01799887766']) {
      throw new Error('Required vendor users are missing. Run node seed.js first.');
    }

    const ads = [
      {
        vendor_id: vendorIdByMobile['01712345678'],
        product_title: 'Hybrid Tomato Seeds',
        description: 'Early flowering variety, high yield',
        price: 850,
        category: 'Seeds',
        location: 'Gazipur',
        quantity: 200,
        unit: 'kg',
      },
      {
        vendor_id: vendorIdByMobile['01712345678'],
        product_title: 'Potassium Fertilizer (50kg)',
        description: 'NPK 0-0-60 for fruiting stage',
        price: 2500,
        category: 'Fertilizer',
        location: 'Gazipur',
        quantity: 100,
        unit: 'bag',
      },
      {
        vendor_id: vendorIdByMobile['01787654321'],
        product_title: 'Fresh Eggplant',
        description: 'Organically grown, pesticide-free',
        price: 120,
        category: 'Produce',
        location: 'Bogura',
        quantity: 800,
        unit: 'kg',
      },
      {
        vendor_id: vendorIdByMobile['01787654321'],
        product_title: 'Green Beans (Fresh)',
        description: 'Tender and crisp, harvested today',
        price: 180,
        category: 'Produce',
        location: 'Bogura',
        quantity: 500,
        unit: 'kg',
      },
      {
        vendor_id: vendorIdByMobile['01799887766'],
        product_title: 'Diesel Hand Pump',
        description: 'Heavy duty 1.5HP with 5m hose',
        price: 8500,
        category: 'Equipment',
        location: 'Dhaka',
        quantity: 15,
        unit: 'piece',
      },
      {
        vendor_id: vendorIdByMobile['01799887766'],
        product_title: 'Agricultural Hose (50m)',
        description: '3-ply rubber, UV resistant',
        price: 1200,
        category: 'Tools',
        location: 'Dhaka',
        quantity: 40,
        unit: 'roll',
      },
      {
        vendor_id: vendorIdByMobile['01712345678'],
        product_title: 'Urea Fertilizer (50kg)',
        description: 'Nitrogen rich for vegetative growth',
        price: 1800,
        category: 'Fertilizer',
        location: 'Gazipur',
        quantity: 150,
        unit: 'bag',
      },
      {
        vendor_id: vendorIdByMobile['01787654321'],
        product_title: 'Red Chili Powder (1kg)',
        description: 'Dried and ground, spicy variety',
        price: 450,
        category: 'Produce',
        location: 'Bogura',
        quantity: 300,
        unit: 'kg',
      },
    ];

    for (const ad of ads) {
      await connection.query(
        `INSERT INTO marketplace_ads (vendor_id, product_title, description, price, category, location, quantity, unit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [ad.vendor_id, ad.product_title, ad.description, ad.price, ad.category, ad.location, ad.quantity, ad.unit]
      );
    }

    console.log(`Added ${ads.length} marketplace ads.`);
  } finally {
    await connection.end();
  }
}

seedMarketplace().catch((error) => {
  console.error('Seeding failed:', error.message);
  process.exit(1);
});
