import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

// Import MongoDB connection and analytics router
import { connectMongo } from './db/mongo.js';
import { mysqlPool } from './db/mysql.js';
import analyticsRouter from './routes/analytics.routes.js';
import statsRouter from './routes/stats.routes.js';
import libraryRouter from './routes/library.routes.js';
import adminRouter from './routes/admin.routes.js';
import reviewsRouter from './routes/reviews.routes.js';
import booksRouter from './routes/books.routes.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

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
app.use('/analytics', analyticsRouter);
app.use('/stats', statsRouter);
app.use('/library', libraryRouter);
app.use('/admin', adminRouter);
app.use('/reviews', reviewsRouter);
app.use('/books', booksRouter);

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