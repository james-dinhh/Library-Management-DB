import { Router } from 'express';
import { mysqlPool } from '../db/mysql.js';

const router = Router();

/**
 * @openapi
 * /admin/books:
 *   post:
 *     tags: [Admin]
 *     summary: Add a new book
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [staffId, title, genre, publisherId, copiesTotal]
 *             properties:
 *               staffId: { type: integer, example: 2 }
 *               title: { type: string, example: "Domain-Driven Design" }
 *               genre: { type: string, example: "Software" }
 *               publisherId: { type: integer, example: 1 }
 *               copiesTotal: { type: integer, example: 5 }
 *               publishedYear: { type: integer, example: 2003 }
 *               coverImageUrl: { type: string, example: "https://example.com/ddd.jpg" }
 *     responses:
 *       201:
 *         description: Book created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 bookId: { type: integer }
 */
router.post('/books', async (req, res) => {
  const { staffId, title, genre, publisherId, copiesTotal, publishedYear, coverImageUrl } = req.body || {};
  if (!staffId || !title || !genre || !publisherId || copiesTotal == null) {
    return res.status(400).json({ error: 'staffId, title, genre, publisherId, copiesTotal are required' });
  }
  try {
    const [procResult] = await mysqlPool.query(
      'CALL sp_add_book(?,?,?,?,?,?,?)',
      [staffId, title, genre, Number(publisherId), Number(copiesTotal), publishedYear ?? null, coverImageUrl ?? null]
    );

    let bookId = null;
    try {
      const firstSet = Array.isArray(procResult) ? procResult[0] : null;
      if (Array.isArray(firstSet) && firstSet[0] && firstSet[0].bookId != null) {
        bookId = Number(firstSet[0].bookId);
      }
    } catch {}

    if (!bookId) {
      const [[row]] = await mysqlPool.query('SELECT LAST_INSERT_ID() AS bookId');
      bookId = row?.bookId ? Number(row.bookId) : null;
    }

    return res.status(201).json({ ok: true, bookId });
  } catch (e) {
    return res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

/**
 * @openapi
 * /admin/books/{id}/inventory:
 *   put:
 *     tags: [Admin]
 *     summary: Update book inventory
 *     security: [{ bearerAuth: [] }]
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
 *             required: [staffId, newTotal]
 *             properties:
 *               staffId: { type: integer, example: 2 }
 *               newTotal: { type: integer, example: 10 }
 *     responses:
 *       200: { description: Inventory updated }
 */
router.put('/books/:id/inventory', async (req, res) => {
  const bookId = Number(req.params.id);
  const { staffId, newTotal } = req.body || {};
  if (!staffId || !Number.isFinite(bookId) || newTotal == null) {
    return res.status(400).json({ error: 'staffId, bookId, newTotal are required' });
  }
  try {
    await mysqlPool.query('CALL sp_update_inventory(?,?,?)', [staffId, bookId, Number(newTotal)]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

/**
 * @openapi
 * /admin/books/{id}/retire:
 *   put:
 *     tags: [Admin]
 *     summary: Retire a book
 *     security: [{ bearerAuth: [] }]
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
 *             required: [staffId]
 *             properties:
 *               staffId: { type: integer, example: 2 }
 *     responses:
 *       200: { description: Book retired }
 */
router.put('/books/:id/retire', async (req, res) => {
  const bookId = Number(req.params.id);
  const { staffId } = req.body || {};
  if (!staffId || !Number.isFinite(bookId)) {
    return res.status(400).json({ error: 'staffId and valid bookId are required' });
  }
  try {
    await mysqlPool.query('CALL sp_retire_book(?,?)', [staffId, bookId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

/**
 * @openapi
 * /admin/books/{id}/unretire:
 *   put:
 *     tags: [Admin]
 *     summary: Unretire a book (make active again)
 *     security: [{ bearerAuth: [] }]
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
 *             required: [staffId]
 *             properties:
 *               staffId: { type: integer, example: 2 }
 *     responses:
 *       200: { description: Book unretired }
 */
router.put('/books/:id/unretire', async (req, res) => {
  const bookId = Number(req.params.id);
  const { staffId } = req.body || {};
  if (!staffId || !Number.isFinite(bookId)) {
    return res.status(400).json({ error: 'staffId and valid bookId are required' });
  }
  try {
    await mysqlPool.query('CALL sp_unretire_book(?,?)', [staffId, bookId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

/**
 * @openapi
 * /admin/books/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a book
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 *       409: { description: Book is referenced by checkouts/reviews; retire instead }
 */
router.delete('/books/:id', async (req, res) => {
  const bookId = Number(req.params.id);
  if (!Number.isFinite(bookId)) {
    return res.status(400).json({ error: 'Invalid book id' });
  }
  try {
    const [r] = await mysqlPool.query('DELETE FROM books WHERE book_id = ?', [bookId]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    if (String(e.code) === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'Book is referenced by checkouts or reviews; use retire instead' });
    }
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

/**
 * @openapi
 * /admin/books/{id}/authors:
 *   post:
 *     tags: [Admin]
 *     summary: Attach authors to a book
 *     security: [{ bearerAuth: [] }]
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
 *             required: [authorIds]
 *             properties:
 *               authorIds:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [3, 5]
 *     responses:
 *       200: { description: Authors attached }
 */
router.post('/books/:id/authors', async (req, res) => {
  const bookId = Number(req.params.id);
  const { authorIds } = req.body || {};
  if (!Number.isFinite(bookId)) {
    return res.status(400).json({ error: 'Invalid book id' });
  }
  if (!Array.isArray(authorIds) || authorIds.length === 0) {
    return res.status(400).json({ error: 'authorIds [] is required' });
  }

  try {
    const ids = [...new Set(authorIds.map(Number))].filter(n => Number.isFinite(n));
    if (!ids.length) return res.status(400).json({ error: 'No valid authorIds' });

    const [rows] = await mysqlPool.query(
      `SELECT author_id FROM authors WHERE author_id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    const found = new Set(rows.map(r => r.author_id));
    const missing = ids.filter(id => !found.has(id));
    if (missing.length) {
      return res.status(400).json({ error: `Unknown authorIds: ${missing.join(', ')}` });
    }

    const values = ids.map(aid => [bookId, aid]);
    await mysqlPool.query(
      'INSERT IGNORE INTO book_authors (book_id, author_id) VALUES ?',
      [values]
    );

    res.json({ ok: true, attached: ids.length });
  } catch (e) {
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

export default router;
