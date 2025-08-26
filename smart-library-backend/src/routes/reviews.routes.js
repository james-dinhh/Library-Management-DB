/**
 * @openapi
 * /reviews:
 *   post:
 *     tags:
 *       - Reviews
 *     summary: Create or update a review
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: integer }
 *               bookId: { type: integer }
 *               rating: { type: integer }
 *               comment: { type: string }
 *     responses:
 *       200:
 *         description: Review created/updated
 *
 * /reviews/book/{bookId}:
 *   get:
 *     tags:
 *       - Reviews
 *     summary: List reviews for a book
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of reviews
 *
 * /reviews/user/{userId}:
 *   get:
 *     tags:
 *       - Reviews
 *     summary: List reviews by a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of reviews
 */
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

// List reviews for a user
// GET /reviews/user/:userId
router.get('/user/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  try {
    const [rows] = await mysqlPool.query(
      `SELECT r.review_id AS id, r.book_id as bookId, r.rating, r.comment, r.review_date AS date
       FROM reviews r
       WHERE r.user_id = ? ORDER BY r.review_date DESC`,
      [userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
