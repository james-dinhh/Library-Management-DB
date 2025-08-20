import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// Import MongoDB connection and analytics router
import { connectMongo } from './db/mongo.js';
import { mysqlPool } from './db/mysql.js';
import { authenticate, authorizeRole } from './middleware/auth.js';
import authRouter from './routes/auth.routes.js';
import analyticsRouter from './routes/analytics.routes.js';
import statsRouter from './routes/stats.routes.js';
import libraryRouter from './routes/library.routes.js';
import adminRouter from './routes/admin.routes.js';
import reviewsRouter from './routes/reviews.routes.js';
import booksRouter from './routes/books.routes.js';

const app = express();

// Middleware
app.use(express.json());
app.use(morgan('dev'));

// Allow your Vite dev origin and your prod site
const allowedOrigins = [
  "http://localhost:5173",           // Vite dev server
  process.env.FRONTEND_URL           // e.g. https://app.your-domain.com
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Server is running',
    database: 'MongoDB',
    timestamp: new Date().toISOString()
  });
});

// Basic route to test the server
app.get('/', (req, res) => {
  res.json({
    message: 'Smart Library Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health'
    }
  });
});

// Register routes
app.use('/auth', authRouter);

// Public endpoint
app.use('/books', booksRouter);

// Protected endpoints
app.use('/library', authenticate, authorizeRole('reader', 'staff'), libraryRouter);
app.use('/reviews', authenticate, authorizeRole('reader', 'staff'), reviewsRouter);
app.use('/analytics', authenticate, authorizeRole('staff'), analyticsRouter);
app.use('/admin', authenticate, authorizeRole('staff'), adminRouter);
app.use('/stats', authenticate, authorizeRole('staff'), statsRouter);

const port = process.env.PORT || 4000;

function checkEnv() {
  if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
    console.error('Missing required environment variable: MONGODB_URI or MONGO_URI');
    process.exit(1);
  }
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_PASSWORD || !process.env.MYSQL_DB) {
    console.error('Missing required MySQL environment variables.');
    process.exit(1);
  }
}

async function startServer() {
  try {
    checkEnv();
    // Connect to MongoDB
    await connectMongo();
    console.log('MongoDB connection established');

    // Test MySQL connection
    try {
      const [rows] = await mysqlPool.query('SELECT 1');
      console.log('MySQL connection established');
    } catch (mysqlErr) {
      console.error('Failed to connect to MySQL:', mysqlErr);
      process.exit(1);
    }

    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log(`📊 Health check available at http://localhost:${port}/health`);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

startServer();