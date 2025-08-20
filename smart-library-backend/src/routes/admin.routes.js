/**
 * @openapi
 * /admin/books:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Add a new book
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               staffId: { type: integer }
 *               title: { type: string }
 *               genre: { type: string }
 *               publisherId: { type: integer }
 *               copiesTotal: { type: integer }
 *               publishedYear: { type: integer }
 *               coverImageUrl: { type: string }
 *     responses:
 *       200:
 *         description: Book added
 *
 * /admin/books/{id}/inventory:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update book inventory
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               staffId: { type: integer }
 *               newTotal: { type: integer }
 *     responses:
 *       200:
 *         description: Inventory updated
 *
 * /admin/books/{id}/retire:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Retire a book
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               staffId: { type: integer }
 *     responses:
 *       200:
 *         description: Book retired
 */
import { Router } from 'express';
import { mysqlPool } from '../db/mysql.js';

const router = Router();

// POST /admin/books (add)
router.post('/books', async (req, res) => {
  const { staffId, title, genre, publisherId, copiesTotal, publishedYear, coverImageUrl } = req.body;
  try {
    await mysqlPool.query('CALL sp_add_book(?,?,?,?,?,?,?)', [
      staffId, title, genre, publisherId, copiesTotal, publishedYear || null, coverImageUrl || null
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
