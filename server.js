// Load environment variables from .env file
require('dotenv').config();

// Import all the modules that set up the app
const createApp = require('./src/config/app');
const createDatabase = require('./src/config/database');
const createUpload = require('./src/config/upload');
const createAuthMiddleware = require('./src/middleware/auth');
const errorHandler = require('./src/middleware/errorHandler');

// Import helper functions for role conversion and connection logic
const { desiredRoleToDbRole, desiredAdminRoleToDbRole, isExpertRole } = require('./src/helpers/roles');
const { normalizeConnectionPair, createConnectionHelpers } = require('./src/helpers/connections');

// Import route registration functions (each one adds API endpoints for a feature)
const registerAuthRoutes = require('./src/routes/authRoutes');
const registerFeedRoutes = require('./src/routes/feedRoutes');
const registerProfileRoutes = require('./src/routes/profileRoutes');
const registerSettingsRoutes = require('./src/routes/settingsRoutes');
const registerAdminRoutes = require('./src/routes/adminRoutes');
const registerNotificationRoutes = require('./src/routes/notificationRoutes');
const registerMarketplaceRoutes = require('./src/routes/marketplaceRoutes');
const registerWeatherRoutes = require('./src/routes/weatherRoutes');
const registerNewsRoutes = require('./src/routes/newsRoutes');

// Create the Express app with session, CORS, and static file support
const app = createApp();
// Create MySQL database pool for queries
const { db } = createDatabase();
// Create multer upload handler for image files
const upload = createUpload();
// Create middleware functions that check if user is logged in or is admin
const { requireAuth, requireAdmin } = createAuthMiddleware(db);
// Create helper function to check connection status between two users
const { getConnectionRelation } = createConnectionHelpers(db);

// Register all the API routes (each one adds endpoints for a feature)
// Auth routes: /api/auth/signup, /api/auth/login, /api/auth/logout, /api/admin/login, etc.
registerAuthRoutes(app, { db });
// Feed routes: /api/posts, /api/posts/:postId/like, /api/posts/:postId/comments
registerFeedRoutes(app, { db, upload, requireAuth });
registerNotificationRoutes(app, { db, requireAuth });
registerProfileRoutes(app, {
  db,
  requireAuth,
  getConnectionRelation,
  normalizeConnectionPair,
  isExpertRole,
});
registerSettingsRoutes(app, { db, requireAuth, desiredRoleToDbRole });
registerAdminRoutes(app, { db, requireAdmin, desiredAdminRoleToDbRole });
registerMarketplaceRoutes(app, { db });
registerWeatherRoutes(app);
registerNewsRoutes(app, { db, requireAuth });

// Add error handling middleware at the end (catches multer and request errors)
app.use(errorHandler);

// Start the server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
