import { Router } from 'express';
import { mysqlPool } from '../db/mysql.js';

const router = Router();

// POST /library/borrow
// body: { "userId": 1, "bookId": 10, "days": 14 }
router.post('/borrow', async (req, res) => {
  const { userId, bookId, days } = req.body;
  try {
    const [rows] = await mysqlPool.query(
      'CALL sp_borrow_book(?,?,?,@out_id); SELECT @out_id AS checkout_id;',
      [userId, bookId, days]
    );
    const checkoutId = rows[1][0].checkout_id;
    res.json({ checkoutId });
  } catch (e) {
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

// POST /library/return
// body: { "checkoutId": 123 }
router.post('/return', async (req, res) => {
  const { checkoutId } = req.body;
  try {
    await mysqlPool.query('CALL sp_return_book(?)', [checkoutId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

export default router;
