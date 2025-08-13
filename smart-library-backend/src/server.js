import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

// Import MongoDB connection instead of MySQL
import { connectMongo } from './db/mongo.js';

// Comment out MySQL imports for now
// import { mysqlPool } from './db/mysql.js';
// import statsRouter from './routes/stats.routes.js';
// import libraryRouter from './routes/library.routes.js';
// import adminRouter from './routes/admin.routes.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Test health endpoint using MongoDB
app.get('/health', async (req, res) => {
  try {
    // Simple health check - if we get here, the server is running
    res.json({ 
      ok: true, 
      message: 'Server is running',
      database: 'MongoDB',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
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

// Comment out MySQL-dependent routes for now
// app.use('/stats', statsRouter);
// app.use('/library', libraryRouter);
// app.use('/admin', adminRouter);

const port = process.env.PORT || 4000;

(async () => {
  try {
    // Connect to MongoDB instead of MySQL
    await connectMongo();
    console.log('MongoDB connection established');
    
    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log(`📊 Health check available at http://localhost:${port}/health`);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
})();