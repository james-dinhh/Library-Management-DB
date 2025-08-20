import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

import { mysqlPool } from './db/mysql.js';
import { connectMongo } from './db/mongo.js';

// Auth middleware + routes
import { authenticate, authorizeRole } from './middleware/auth.js';
import authRouter from './routes/auth.routes.js';

// Feature routers
import booksRouter from './routes/books.routes.js';
import libraryRouter from './routes/library.routes.js';
import reviewsRouter from './routes/reviews.routes.js';
import analyticsRouter from './routes/analytics.routes.js';
import adminRouter from './routes/admin.routes.js';
import statsRouter from './routes/stats.routes.js';

// Swagger (OpenAPI)
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Swagger configuration
const routesGlob = path.join(__dirname, 'routes', '*.js');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Library Backend API',
      version: '1.0.0',
      description: 'API documentation for the Smart Library platform',
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 4000}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    // By default, require Bearer auth. Clear it per-path in JSDoc with `security: []` if needed.
    security: [{ bearerAuth: [] }],
  },
  apis: [routesGlob], // scan actual route files next to this server.js
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
console.log('Swagger scanning:', routesGlob);
console.log('Swagger paths loaded:', Object.keys(swaggerSpec.paths || {}).length);

// Health check
app.get('/health', async (req, res) => {
  try {
    // MySQL ping
    const [rows] = await mysqlPool.query('SELECT 1 AS ok');
    const mysqlOk = rows?.[0]?.ok === 1;

    // (Optional) Mongo ping — only if connectMongo ran at startup
    let mongoOk = true;
    try {
      // If you exported getDb() you could ping here; we assume connectMongo() ran.
      mongoOk = true;
    } catch {
      mongoOk = false;
    }

    res.json({ ok: mysqlOk && mongoOk, mysqlOk, mongoOk });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Public routes
app.use('/auth', authRouter);

// Make /books public read-only (you can protect it if you prefer)
app.use('/books', booksRouter);

// Protected routes
// Readers + Staff can borrow/return and write reviews
app.use('/library', authenticate, authorizeRole('reader', 'staff'), libraryRouter);
app.use('/reviews', authenticate, authorizeRole('reader', 'staff'), reviewsRouter);

// Staff-only analytics, admin, stats
app.use('/analytics', authenticate, authorizeRole('staff'), analyticsRouter);
app.use('/admin', authenticate, authorizeRole('staff'), adminRouter);
app.use('/stats', authenticate, authorizeRole('staff'), statsRouter);

// Startup
const port = process.env.PORT || 4000;

(async () => {
  try {
    // Connect Mongo first (re-entrant safe in your mongo.js)
    await connectMongo();

    // Verify MySQL connectivity once
    await mysqlPool.query('SELECT 1');

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log(`Swagger UI at http://localhost:${port}/api-docs`);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
})();
