# Backend Architecture (Presentation Sheet)

## Mermaid Diagram

```mermaid
flowchart LR
    U[User Browser]
    A[Express App\nserver.js]

    U -->|HTTP API Calls| A

    subgraph BOOT[Startup + Core Wiring]
      C1[config/app.js\nExpress + Session + Static]
      C2[config/database.js\nMySQL Pool + db]
      C3[config/upload.js\nMulter Upload Rules]
      M1[middleware/auth.js\nrequireAuth + requireAdmin]
      M2[middleware/errorHandler.js\nGlobal Error Handler]
      H1[helpers/roles.js\nRole Mapping]
      H2[helpers/connections.js\nConnection Logic]
    end

    A --> C1
    A --> C2
    A --> C3
    A --> M1
    A --> M2
    A --> H1
    A --> H2

    subgraph ROUTES[Feature Route Modules]
      R1[routes/authRoutes.js\nSignup/Login/Auth Check]
      R2[routes/feedRoutes.js\nPosts/Likes/Comments]
      R3[routes/profileRoutes.js\nProfiles/Connections/Follows]
      R4[routes/settingsRoutes.js\nPassword/Role Request]
      R5[routes/adminRoutes.js\nAdmin Moderation + Roles]
      R6[routes/marketplaceRoutes.js\nMarketplace Read]
      R7[routes/weatherRoutes.js\nWeather Forecast]
      R8[routes/newsRoutes.js\nNews Fetch + Share]
    end

    A --> R1
    A --> R2
    A --> R3
    A --> R4
    A --> R5
    A --> R6
    A --> R7
    A --> R8

    subgraph DATA[Data + External Services]
      DB[(MySQL Database)]
      W[Open-Meteo API]
      N[GDELT News API]
    end

    R1 --> DB
    R2 --> DB
    R3 --> DB
    R4 --> DB
    R5 --> DB
    R6 --> DB
    R8 --> DB

    R7 --> W
    R8 --> N
```

## 20-Second Talk Track

- The server entry file is now small and only wires modules.
- Config files prepare Express, database, and uploads.
- Middleware handles security checks and centralized errors.
- Each feature has its own route file, so responsibilities are isolated.
- Most modules use MySQL, while weather and news also call external APIs.

## Why This Is Better Than One Big server.js

- Easier to explain by feature.
- Easier to debug and maintain.
- Easier for team collaboration.
- Lower risk when changing one feature.
