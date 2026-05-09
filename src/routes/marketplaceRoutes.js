function registerMarketplaceRoutes(app, { db, upload, requireAuth }) {
  const { createNotification } = require('../helpers/notifications');

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

  // ENDPOINT 3: PUT /api/marketplace/:id - Edit an existing ad (seller must own ad)
  app.put('/api/marketplace/:id', requireAuth, upload.single('image'), async (req, res) => {
    const adId = Number(req.params.id || 0);
    if (!Number.isInteger(adId) || adId <= 0) {
      return res.status(400).json({ message: 'Invalid ad id' });
    }

    try {
      // Verify ad exists and belongs to current user
      const [adRows] = await db.query('SELECT vendor_id, image_path FROM marketplace_ads WHERE id = ? LIMIT 1', [adId]);
      if (adRows.length === 0) {
        return res.status(404).json({ message: 'Ad not found' });
      }

      const ad = adRows[0];
      if (ad.vendor_id !== req.session.userId) {
        return res.status(403).json({ message: 'You are not the owner of this ad' });
      }

      // Extract fields to update
      const {
        productTitle,
        description,
        price,
        category,
        location,
        quantity,
        unit,
        isActive,
      } = req.body;

      const imagePath = req.file ? `/uploads/${req.file.filename}` : ad.image_path || null;

      // Build update query dynamically
      const updates = [];
      const params = [];
      if (productTitle !== undefined) {
        updates.push('product_title = ?');
        params.push(String(productTitle).trim());
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(String(description).trim());
      }
      if (price !== undefined) {
        updates.push('price = ?');
        params.push(parseFloat(price));
      }
      if (category !== undefined) {
        updates.push('category = ?');
        params.push(String(category).trim());
      }
      if (location !== undefined) {
        updates.push('location = ?');
        params.push(String(location).trim());
      }
      if (quantity !== undefined) {
        updates.push('quantity = ?');
        params.push(quantity ? parseInt(quantity, 10) : null);
      }
      if (unit !== undefined) {
        updates.push('unit = ?');
        params.push(unit ? String(unit).trim() : null);
      }
      if (req.file) {
        updates.push('image_path = ?');
        params.push(imagePath);
      }
      if (isActive !== undefined) {
        updates.push('is_active = ?');
        params.push(Boolean(isActive) ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      params.push(adId);
      const sql = `UPDATE marketplace_ads SET ${updates.join(', ')} WHERE id = ?`;
      await db.query(sql, params);

      res.json({ message: 'Ad updated successfully', adId, imagePath });
    } catch (error) {
      console.error('Failed to update marketplace ad:', error.message);
      res.status(500).json({ message: 'Failed to update marketplace ad' });
    }
  });

  // ENDPOINT 4: POST /api/sellers/:sellerId/reviews - Create a review for a seller
  app.post('/api/sellers/:sellerId/reviews', requireAuth, async (req, res) => {
    const sellerId = Number(req.params.sellerId || 0);
    if (!Number.isInteger(sellerId) || sellerId <= 0) {
      return res.status(400).json({ message: 'Invalid seller id' });
    }

    const { rating, comment } = req.body || {};
    const r = parseInt(rating, 10);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }

    try {
      // Ensure seller exists
      const [sellerRows] = await db.query('SELECT id FROM users WHERE id = ? LIMIT 1', [sellerId]);
      if (sellerRows.length === 0) {
        return res.status(404).json({ message: 'Seller not found' });
      }

      // Insert into existing `reviews` table (buyer_id, seller_id, marketplace_ad_id, rating, review_text)
      await db.query(
        `INSERT INTO reviews (buyer_id, seller_id, marketplace_ad_id, rating, review_text) VALUES (?, ?, NULL, ?, ?)`,
        [req.session.userId, sellerId, r, comment ? String(comment).trim() : null]
      );

      await createNotification(db, {
        recipientId: sellerId,
        actorId: req.session.userId,
        type: 'seller_review',
      });

      res.status(201).json({ message: 'Review posted' });
    } catch (error) {
      console.error('Failed to post review:', error.message);
      res.status(500).json({ message: 'Failed to post review' });
    }
  });

  // ENDPOINT 5: GET /api/sellers/:sellerId/reviews - List reviews for a seller
  app.get('/api/sellers/:sellerId/reviews', async (req, res) => {
    const sellerId = Number(req.params.sellerId || 0);
    if (!Number.isInteger(sellerId) || sellerId <= 0) {
      return res.status(400).json({ message: 'Invalid seller id' });
    }

    try {
      const [rows] = await db.query(
        `SELECT r.id, r.rating, r.review_text AS comment, r.created_at AS createdAt, u.id AS reviewerId, u.full_name AS reviewerName
         FROM reviews r
         LEFT JOIN users u ON r.buyer_id = u.id
         WHERE r.seller_id = ?
         ORDER BY r.created_at DESC`,
        [sellerId]
      );

      res.json(rows);
    } catch (error) {
      console.error('Failed to fetch reviews:', error.message);
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  });
}

module.exports = registerMarketplaceRoutes;
