import { Router } from 'express';
import { mysqlPool } from '../db/mysql.js';

const router = Router();

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

export default router;
