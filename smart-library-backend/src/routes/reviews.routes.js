import { Router } from 'express';
import { mysqlPool } from '../db/mysql.js';

const router = Router();

// Create or update a review
// POST /reviews
// body: { "userId": 1, "bookId": 1, "rating": 5, "comment": "Great book!" }
router.post('/', async (req, res) => {
  const { userId, bookId, rating, comment } = req.body || {};
  if (!userId || !bookId || !rating) {
    return res.status(400).json({ error: 'userId, bookId, rating are required' });
  }
  try {
    await mysqlPool.query('CALL sp_review_book(?,?,?,?)', [userId, bookId, rating, comment ?? null]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

// List reviews for a book
// GET /reviews/book/:bookId
router.get('/book/:bookId', async (req, res) => {
  const bookId = Number(req.params.bookId);
  try {
    const [rows] = await mysqlPool.query(
      `SELECT r.review_id AS id, u.name AS userName, r.rating, r.comment, r.review_date AS date
       FROM reviews r JOIN users u ON u.user_id = r.user_id
       WHERE r.book_id = ? ORDER BY r.review_date DESC`,
      [bookId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
