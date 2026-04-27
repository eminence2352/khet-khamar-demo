function registerNewsRoutes(app, { db, requireAuth }) {
  let externalNewsCache = {
    rows: [],
    cachedAt: 0,
  };

  app.post('/api/news/share', requireAuth, async (req, res) => {
    const { title, excerpt, url, source, category, caption } = req.body;

    const trimmedTitle = String(title || '').trim();
    const trimmedExcerpt = String(excerpt || '').trim();
    const trimmedUrl = String(url || '').trim();
    const trimmedSource = String(source || '').trim();
    const trimmedCategory = String(category || '').trim();
    const trimmedCaption = String(caption || '').trim();

    if (!trimmedTitle) {
      return res.status(400).json({ message: 'News title is required to share.' });
    }

    try {
      const [result] = await db.query(
        `INSERT INTO posts
         (user_id, post_type, text_content, shared_news_title, shared_news_excerpt, shared_news_url, shared_news_source, shared_news_category)
         VALUES (?, 'news_share', ?, ?, ?, ?, ?, ?)`,
        [
          req.session.userId,
          trimmedCaption,
          trimmedTitle,
          trimmedExcerpt || null,
          trimmedUrl || null,
          trimmedSource || null,
          trimmedCategory || null,
        ]
      );

      res.status(201).json({ message: 'News shared to feed.', postId: result.insertId });
    } catch (error) {
      console.error('Failed to share news:', error.message);
      res.status(500).json({ message: 'Failed to share news' });
    }
  });

  app.get('/api/news', async (req, res) => {
    try {
      const limit = 10;
      const searchQuery = 'agriculture';
      const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(searchQuery)}&mode=ArtList&maxrecords=${limit}&format=json&sort=DateDesc`;

      try {
        let externalText = '';
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const externalResponse = await fetch(gdeltUrl);
          externalText = await externalResponse.text();

          if (!externalText.startsWith('Please limit requests')) {
            break;
          }

          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 5500));
          }
        }

        let externalJson = null;
        try {
          externalJson = JSON.parse(externalText);
        } catch (parseError) {
          throw new Error(`Non-JSON response from GDELT: ${externalText.slice(0, 120)}`);
        }

        const articles = Array.isArray(externalJson.articles) ? externalJson.articles : [];

        const externalRows = articles.map((article, index) => {
          const title = String(article.title || '').trim();
          const excerpt = String(article.seendate || '').trim();
          const sourceName = String(article.domain || article.sourcecountry || 'External Source').trim();
          const text = `${title} ${excerpt}`.toLowerCase();

          let mappedCategory = 'Market';
          if (text.includes('weather') || text.includes('rain') || text.includes('monsoon')) mappedCategory = 'Weather';
          else if (text.includes('seed')) mappedCategory = 'Seeds';
          else if (text.includes('pest') || text.includes('insect') || text.includes('disease')) mappedCategory = 'Pest Control';
          else if (text.includes('irrigation') || text.includes('water')) mappedCategory = 'Irrigation';
          else if (text.includes('technology') || text.includes('drone') || text.includes('iot')) mappedCategory = 'Technology';
          else if (text.includes('policy') || text.includes('ministry') || text.includes('government')) mappedCategory = 'Government';
          else if (text.includes('tip') || text.includes('guide') || text.includes('practice')) mappedCategory = 'Tips';

          return {
            id: `ext-${index + 1}`,
            title: title || 'Agricultural update',
            excerpt: excerpt || 'Latest agricultural update',
            category: mappedCategory,
            imageUrl: article.socialimage || null,
            source: sourceName,
            isFeatured: index < 2 ? 1 : 0,
            createdAt: article.seendate || new Date().toISOString(),
            url: article.url || null,
          };
        });

        if (externalRows.length > 0) {
          externalNewsCache = {
            rows: externalRows.slice(0, limit),
            cachedAt: Date.now(),
          };
          return res.json(externalRows.slice(0, limit));
        }
      } catch (externalError) {
        console.error('External news fetch failed:', externalError.message);

        const cacheIsFresh = externalNewsCache.rows.length > 0 && (Date.now() - externalNewsCache.cachedAt) < (15 * 60 * 1000);
        if (cacheIsFresh) {
          return res.json(externalNewsCache.rows);
        }
      }

      const [rows] = await db.query(
        `SELECT
          id,
          title,
          excerpt,
          category,
          image_url AS imageUrl,
          source,
          is_featured AS isFeatured,
          created_at AS createdAt,
          NULL AS url
        FROM agricultural_news
        WHERE is_active = TRUE
        ORDER BY is_featured DESC, created_at DESC
        LIMIT ?`,
        [limit]
      );

      res.json(rows);
    } catch (error) {
      console.error('Failed to fetch news:', error.message);
      res.status(500).json({ message: 'Failed to fetch news' });
    }
  });
}

module.exports = registerNewsRoutes;
