require('dotenv').config();
const mysql = require('mysql2/promise');

async function seedNews() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    const [newsCountRows] = await connection.query('SELECT COUNT(*) AS total FROM Agricultural_News');
    const newsCount = newsCountRows[0].total;

    if (newsCount === 0) {
      const newsData = [
        {
          title: 'Monsoon Rainfall Patterns Expected to Increase',
          excerpt: 'Meteorological departments predict 15% higher rainfall during upcoming monsoon season.',
          category: 'Weather',
          source: 'Bangladesh Meteorological Department',
          featured: true,
        },
        {
          title: 'New Organic Fertilizer Subsidy Program Launched',
          excerpt: 'Government announces 40% subsidy on certified organic fertilizers for registered farmers.',
          category: 'Government',
          source: 'Ministry of Agriculture',
          featured: true,
        },
        {
          title: 'Tomato Prices Rise 20% Due to Supply Shortage',
          excerpt: 'Market analysis shows tomato prices climbing due to reduced harvest from recent floods.',
          category: 'Market',
          source: 'Agricultural Commodity Market',
          featured: false,
        },
        {
          title: 'Drip Irrigation Reduces Water Usage by 50%',
          excerpt: 'Study shows drip irrigation systems cut water consumption significantly while improving crop yield.',
          category: 'Irrigation',
          source: 'Agricultural Research Institute',
          featured: false,
        },
        {
          title: 'Armyworm Infestation Warning Issued for Central Region',
          excerpt: 'Agricultural experts warn farmers to monitor fields for armyworm activity and implement preventive measures.',
          category: 'Pest Control',
          source: 'Plant Protection Division',
          featured: false,
        },
        {
          title: 'High-Yield Rice Varieties Show Promise in Field Trials',
          excerpt: 'New rice cultivars demonstrate 25% higher yield potential with reduced fertilizer requirements.',
          category: 'Seeds',
          source: 'Bangladesh Rice Research Institute',
          featured: false,
        },
        {
          title: 'Best Practices for Sustainable Crop Rotation',
          excerpt: 'Experts share techniques to maintain soil health and maximize productivity through effective rotation strategies.',
          category: 'Tips',
          source: 'Agronomy Extension Service',
          featured: false,
        },
        {
          title: 'IoT Sensors Revolutionizing Precision Agriculture',
          excerpt: 'Smart sensors now enable farmers to monitor soil moisture, temperature, and nutrient levels in real-time.',
          category: 'Technology',
          source: 'Agricultural Tech Magazine',
          featured: false,
        },
        {
          title: 'Cooperative Marketing Groups Show 30% Income Increase',
          excerpt: 'Farmer cooperatives reporting significant revenue improvements through collective marketing efforts.',
          category: 'Market',
          source: 'Farmers Cooperative Database',
          featured: false,
        },
        {
          title: 'Climate-Smart Agriculture Workshop Scheduled for March',
          excerpt: 'Free training program teaching farmers to adapt farming practices to changing climate conditions.',
          category: 'Tips',
          source: 'FAO Bangladesh',
          featured: false,
        },
      ];

      for (const news of newsData) {
        await connection.query(
          `INSERT INTO Agricultural_News (title, excerpt, category, source, is_featured, is_active)
           VALUES (?, ?, ?, ?, ?, TRUE)`,
          [news.title, news.excerpt, news.category, news.source, news.featured ? 1 : 0]
        );
      }

      console.log(`Seeded ${newsData.length} agricultural news articles.`);
    } else {
      console.log(`Agricultural_News table already has ${newsCount} articles.`);
    }

    await connection.end();
  } catch (error) {
    console.error('News seeding error:', error.message);
    await connection.end();
    process.exit(1);
  }
}

seedNews();
