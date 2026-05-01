function registerMarketplaceRoutes(app, { db, upload, requireAuth }) {
  // ENDPOINT 1: GET /api/marketplace - Fetch marketplace ads with filtering
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
          u.is_verified AS isVerifiedSeller,
          u.role AS sellerRole
        FROM marketplace_ads m
        LEFT JOIN users u ON m.vendor_id = u.id
        WHERE m.is_active = TRUE
        ORDER BY m.created_at DESC`
      );

      // Apply filtering on backend
      let filteredRows = rows;
      const selectedCategory = req.query.category;
      const selectedLocation = req.query.location;

      if (selectedCategory && selectedCategory.trim() !== '') {
        filteredRows = filteredRows.filter((item) => item.category === selectedCategory);
      }

      if (selectedLocation && selectedLocation.trim() !== '') {
        filteredRows = filteredRows.filter((item) => item.location === selectedLocation);
      }

      res.json(filteredRows);
    } catch (error) {
      console.error('Failed to fetch marketplace ads:', error.message);
      res.status(500).json({ message: 'Failed to fetch marketplace ads' });
    }
  });

  // ENDPOINT 2: POST /api/marketplace - Create a new marketplace ad (sellers only)
  app.post('/api/marketplace', requireAuth, upload.single('image'), async (req, res) => {
    try {
      // First, get current user's role
      const [userRows] = await db.query(
        'SELECT role FROM users WHERE id = ? LIMIT 1',
        [req.session.userId]
      );

      if (userRows.length === 0) {
        return res.status(401).json({ message: 'User not found' });
      }

      const userRole = userRows[0].role;

      // Check if user is a seller (General Vendor or Verified Vendor)
      if (userRole !== 'General Vendor' && userRole !== 'Verified Vendor') {
        return res.status(403).json({ message: 'Only sellers can post marketplace ads' });
      }

      // Extract form data
      const {
        productTitle,
        description,
        price,
        category,
        location,
        quantity,
        unit,
      } = req.body;

      // Validate required fields
      if (!productTitle || !productTitle.trim()) {
        return res.status(400).json({ message: 'Product title is required' });
      }
      if (!category || !category.trim()) {
        return res.status(400).json({ message: 'Category is required' });
      }
      if (!location || !location.trim()) {
        return res.status(400).json({ message: 'Location is required' });
      }
      if (!price || parseFloat(price) < 0) {
        return res.status(400).json({ message: 'Valid price is required' });
      }

      // Get uploaded image path if one was provided
      const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

      // Insert the new marketplace ad
      const [result] = await db.query(
        `INSERT INTO marketplace_ads (
          vendor_id, 
          product_title, 
          description, 
          price, 
          category, 
          location, 
          image_path, 
          quantity, 
          unit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.session.userId,
          productTitle.trim(),
          description ? description.trim() : '',
          parseFloat(price),
          category.trim(),
          location.trim(),
          imagePath,
          quantity ? parseInt(quantity, 10) : null,
          unit ? unit.trim() : null,
        ]
      );

      res.status(201).json({
        message: 'Product posted successfully',
        adId: result.insertId,
        imagePath,
      });
    } catch (error) {
      console.error('Failed to create marketplace ad:', error.message);
      res.status(500).json({ message: 'Failed to create marketplace ad' });
    }
  });
}

module.exports = registerMarketplaceRoutes;
