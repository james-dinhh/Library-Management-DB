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
 *               publisherId:
 *                 type: integer
 *                 example: 1
 *                 description: Provide either publisherId or publisherName
 *               publisherName:
 *                 type: string
 *                 example: "Addison-Wesley"
 *                 description: Used to create or reuse a publisher if publisherId is not provided
 *               publisherAddress:
 *                 type: string
 *                 example: "75 Arlington St, Boston, MA"
 *               copiesTotal: { type: integer, example: 5 }
 *               publishedYear: { type: integer, example: 2003 }
 *               coverImageUrl: { type: string, example: "https://example.com/ddd.jpg" }
 *               authorIds:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [3, 5]
 *               authorNames:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["Eric Evans", "Martin Fowler"]
 *               authorBios:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["Eric Evans is the author of Domain-Driven Design.", "Martin Fowler is a software engineer and author."]
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
router.post("/books", async (req, res) => {
  const {
    staffId,
    title,
    genre,
    publisherId,
    publisherName,
    publisherAddress,
    publishedYear,
    copiesTotal,
    coverImageUrl,
    authorIds,
    authorNames,
    authorBios
  } = req.body;

  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();

    let finalPublisherId = publisherId;

    // Handle publisher
    if (!finalPublisherId && publisherName) {
      await connection.query(
        "INSERT IGNORE INTO publishers (name, address) VALUES (?, ?)",
        [publisherName, publisherAddress || null]
      );
      const [rows] = await connection.query(
        "SELECT publisher_id FROM publishers WHERE name = ?",
        [publisherName]
      );
      if (rows.length > 0) {
        finalPublisherId = rows[0].publisher_id;
      }
    }

    if (!finalPublisherId) {
      await connection.rollback();
      return res.status(400).json({ error: "Publisher is required" });
    }

    // Insert book
    const [bookResult] = await connection.query(
      `INSERT INTO books 
       (title, genre, published_year, publisher_id, cover_image_url, copies_total, copies_available, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [title, genre, publishedYear, finalPublisherId, coverImageUrl || null, copiesTotal, copiesTotal]
    );

    const bookId = bookResult.insertId;

    // Handle authors
    const finalAuthorIds = authorIds ? [...authorIds] : [];

    if (authorNames && authorNames.length > 0) {
      for (let i = 0; i < authorNames.length; i++) {
        const authorName = authorNames[i];
        const authorBio = authorBios && authorBios[i] ? authorBios[i] : null;

        // Insert new author or update existing bio if provided
        await connection.query(
          `INSERT INTO authors (name, bio)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE bio = COALESCE(VALUES(bio), bio)`,
          [authorName, authorBio]
        );
      }

      const [authorRows] = await connection.query(
        "SELECT author_id FROM authors WHERE name IN (?)",
        [authorNames]
      );
      finalAuthorIds.push(...authorRows.map(r => r.author_id));
    }

    // Attach authors to book
    if (finalAuthorIds.length > 0) {
      const values = finalAuthorIds.map(aid => [bookId, aid]);
      await connection.query(
        "INSERT IGNORE INTO book_authors (book_id, author_id) VALUES ?",
        [values]
      );
    }

    // Log staff action
    await connection.query(
      "INSERT INTO staff_logs (staff_id, action_type, book_id, timestamp) VALUES (?, 'add_book', ?, NOW())",
      [staffId, bookId]
    );

    await connection.commit();

    res.json({ bookId });
  } catch (err) {
    await connection.rollback();
    console.error("Error adding book:", err);
    res.status(500).json({ error: "Failed to add book" });
  } finally {
    connection.release();
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
