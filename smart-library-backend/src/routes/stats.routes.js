/**
 * @openapi
 * /stats/is-available/{bookId}:
 *   get:
 *     tags:
 *       - Stats
 *     summary: Check if a book is available
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Availability status
 *
 * /stats/return-on-time/{checkoutId}:
 *   get:
 *     tags:
 *       - Stats
 *     summary: Check if a return was on time
 *     parameters:
 *       - in: path
 *         name: checkoutId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Return status
 *
 * /stats/borrow-count:
 *   get:
 *     tags:
 *       - Stats
 *     summary: Get borrow count in a date range
 *     parameters:
 *       - in: query
 *         name: start
 *         required: true
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: end
 *         required: true
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Borrow count
 */

import { Router } from 'express';
import { mysqlPool } from '../db/mysql.js';

const router = Router();

// GET /stats/is-available/:bookId
router.get('/is-available/:bookId', async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    const [rows] = await mysqlPool.query('SELECT fn_is_book_available(?) AS available', [bookId]);
    res.json({ bookId, available: rows[0].available === 1 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /stats/return-on-time/:checkoutId
router.get('/return-on-time/:checkoutId', async (req, res) => {
  try {
    const checkoutId = Number(req.params.checkoutId);
    const [rows] = await mysqlPool.query('SELECT fn_is_return_on_time(?) AS on_time', [checkoutId]);

    // on_time could be 1, 0, or NULL
    res.json({ checkoutId, on_time: rows[0].on_time });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /stats/borrow-count?start=2025-08-01T00:00:00&end=2025-08-31T23:59:59
router.get('/borrow-count', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end are required' });

    const [rows] = await mysqlPool.query(
      'SELECT fn_count_borrowed_in_range(?, ?) AS count_borrowed',
      [new Date(start), new Date(end)]
    );
    res.json({ start, end, count: rows[0].count_borrowed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
