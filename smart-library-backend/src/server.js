import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

import { mysqlPool } from './db/mysql.js';
import { connectMongo } from './db/mongo.js';
import statsRouter from './routes/stats.routes.js';
import libraryRouter from './routes/library.routes.js';
import adminRouter from './routes/admin.routes.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Test health
app.get('/health', async (req, res) => {
  try {
    const [rows] = await mysqlPool.query('SELECT 1 AS ok');
    res.json({ ok: rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Routes that call MySQL functions
app.use('/stats', statsRouter);
app.use('/library', libraryRouter);
app.use('/admin', adminRouter);

const port = process.env.PORT || 4000;

(async () => {
  try {
    await connectMongo();
    await mysqlPool.query('SELECT 1'); // Verify MySQL connectivity once
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
})();
