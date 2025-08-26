import { Router } from 'express';
import { mysqlPool } from '../db/mysql.js';

const router = Router();

// GET /reports/most-borrowed?start=...&end=...
router.get('/most-borrowed', async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'start and end required' });
  try {
    // Most borrowed books
    const [rows] = await mysqlPool.query(
      `SELECT b.title, COUNT(c.checkout_id) AS count
       FROM checkouts c
       JOIN books b ON c.book_id = b.book_id
       WHERE c.borrow_date BETWEEN ? AND ?
       GROUP BY b.book_id
       ORDER BY count DESC
       LIMIT 10`,
      [start, end]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /reports/top-readers
router.get('/top-readers', async (req, res) => {
  try {
    // Top readers
    const [rows] = await mysqlPool.query(
      `SELECT u.name, COUNT(c.checkout_id) AS checkouts
       FROM checkouts c
       JOIN users u ON c.user_id = u.user_id
       GROUP BY u.user_id
       ORDER BY checkouts DESC
       LIMIT 10`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /reports/low-availability
router.get('/low-availability', async (req, res) => {
  try {
    // Low availability
    const [rows] = await mysqlPool.query(
      `SELECT title, copies_available
       FROM books
       WHERE copies_available <= 3
       ORDER BY copies_available ASC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;