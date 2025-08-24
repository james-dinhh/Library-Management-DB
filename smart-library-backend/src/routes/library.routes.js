import { Router } from 'express';
import { mysqlPool } from '../db/mysql.js';

const router = Router();
/**
 * @openapi
 * /library/borrow:
 *   post:
 *     tags:
 *       - Library
 *     summary: Borrow a book
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *               bookId:
 *                 type: integer
 *               days:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Successful response
 */

// POST /library/borrow
router.post('/borrow', async (req, res) => {
  const { userId, bookId, days } = req.body;
  try {
    // Prepare OUT parameter
    const [rows] = await mysqlPool.query('CALL sp_borrow_book(?,?,?,@out_id)', [userId, bookId, days]);
    // Get the OUT parameter value
    const [[outRow]] = await mysqlPool.query('SELECT @out_id AS checkout_id');
    res.json({ checkoutId: outRow.checkout_id });
  } catch (e) {
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});
/**
 * @openapi
 * /library/return:
 *   post:
 *     tags:
 *       - Library
 *     summary: Return a book
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               checkoutId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Successful response
 */

// POST /library/return
router.post('/return', async (req, res) => {
  const { checkoutId } = req.body;
  try {
    await mysqlPool.query('CALL sp_return_book(?)', [checkoutId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

/**
 * @openapi
 * /library/user/{userId}/borrowings:
 *   get:
 *     tags:
 *       - Library
 *     summary: Get user's borrowing records
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   checkout_id:
 *                     type: integer
 *                   user_id:
 *                     type: integer
 *                   book_id:
 *                     type: integer
 *                   borrow_date:
 *                     type: string
 *                     format: date-time
 *                   due_date:
 *                     type: string
 *                     format: date-time
 *                   return_date:
 *                     type: string
 *                     format: date-time
 *                   is_late:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   author:
 *                     type: string
 *       400:
 *         description: Bad request
 */

// GET /library/user/:userId/borrowings
router.get('/user/:userId/borrowings', async (req, res) => {
  const { userId } = req.params;
  
  // Validate that userId is a number
  const userIdNum = parseInt(userId);
  if (isNaN(userIdNum)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const [rows] = await mysqlPool.query(`
      SELECT 
        c.checkout_id,
        c.user_id,
        c.book_id,
        c.borrow_date,
        c.due_date,
        c.return_date,
        c.is_late,
        b.title,
        GROUP_CONCAT(a.name SEPARATOR ', ') as author
      FROM checkouts c
      JOIN books b ON c.book_id = b.book_id
      LEFT JOIN book_authors ba ON b.book_id = ba.book_id
      LEFT JOIN authors a ON ba.author_id = a.author_id
      WHERE c.user_id = ?
      GROUP BY c.checkout_id, c.user_id, c.book_id, c.borrow_date, c.due_date, c.return_date, c.is_late, b.title
      ORDER BY c.borrow_date DESC
    `, [userIdNum]);
    
    res.json(rows);
  } catch (e) {
    console.error('Error fetching user borrowings:', e);
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

export default router;
