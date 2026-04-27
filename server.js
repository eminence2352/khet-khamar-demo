require('dotenv').config();

const createApp = require('./src/config/app');
const createDatabase = require('./src/config/database');
const createUpload = require('./src/config/upload');
const createAuthMiddleware = require('./src/middleware/auth');
const errorHandler = require('./src/middleware/errorHandler');

const { desiredRoleToDbRole, desiredAdminRoleToDbRole, isExpertRole } = require('./src/helpers/roles');
const { normalizeConnectionPair, createConnectionHelpers } = require('./src/helpers/connections');

const registerAuthRoutes = require('./src/routes/authRoutes');
const registerFeedRoutes = require('./src/routes/feedRoutes');
const registerProfileRoutes = require('./src/routes/profileRoutes');
const registerSettingsRoutes = require('./src/routes/settingsRoutes');
const registerAdminRoutes = require('./src/routes/adminRoutes');
const registerMarketplaceRoutes = require('./src/routes/marketplaceRoutes');
const registerWeatherRoutes = require('./src/routes/weatherRoutes');
const registerNewsRoutes = require('./src/routes/newsRoutes');

const app = createApp();
const { db } = createDatabase();
const upload = createUpload();
const { requireAuth, requireAdmin } = createAuthMiddleware(db);
const { getConnectionRelation } = createConnectionHelpers(db);

registerAuthRoutes(app, { db });
registerFeedRoutes(app, { db, upload, requireAuth });
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

app.use(errorHandler);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
