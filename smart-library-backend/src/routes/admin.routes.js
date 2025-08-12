import { Router } from 'express';
import { mysqlPool } from '../db/mysql.js';

const router = Router();

// POST /admin/books (add)
router.post('/books', async (req, res) => {
  const { staffId, title, genre, publisherId, copiesTotal } = req.body;
  try {
    await mysqlPool.query('CALL sp_add_book(?,?,?,?,?)', [
      staffId, title, genre, publisherId, copiesTotal
    ]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

// PUT /admin/books/:id/inventory (update total)
router.put('/books/:id/inventory', async (req, res) => {
  const bookId = Number(req.params.id);
  const { staffId, newTotal } = req.body;
  try {
    await mysqlPool.query('CALL sp_update_inventory(?,?,?)', [
      staffId, bookId, newTotal
    ]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

// PUT /admin/books/:id/retire
router.put('/books/:id/retire', async (req, res) => {
  const bookId = Number(req.params.id);
  const { staffId } = req.body;
  try {
    await mysqlPool.query('CALL sp_retire_book(?,?)', [staffId, bookId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

export default router;
