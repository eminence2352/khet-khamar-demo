function registerMarketplaceRoutes(app, { db }) {
  app.get('/api/marketplace', async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT
          m.id,
          m.product_title AS productTitle,
          m.description,
          m.price,
          m.category,
          m.location,
          m.image_path AS imagePath,
          m.quantity,
          m.unit,
          m.created_at AS createdAt,
          u.id AS sellerId,
          u.full_name AS sellerName,
          u.mobile_number AS sellerMobile,
          u.is_verified AS isVerifiedSeller
        FROM marketplace_ads m
        LEFT JOIN users u ON m.vendor_id = u.id
        WHERE m.is_active = TRUE
        ORDER BY m.created_at DESC`
      );

      let filteredRows = rows;
      const selectedCategory = req.query.category;
      if (selectedCategory && selectedCategory !== '') {
        filteredRows = rows.filter((item) => item.category === selectedCategory);
      }

      res.json(filteredRows);
    } catch (error) {
      console.error('Failed to fetch marketplace ads:', error.message);
      res.status(500).json({ message: 'Failed to fetch marketplace ads' });
    }
  });
}

module.exports = registerMarketplaceRoutes;
