import { Router } from 'express';
import { mysqlPool } from '../db/mysql.js';

const router = Router();

/**
 * @openapi
 * /publishers:
 *   get:
 *     tags: [Publishers]
 *     summary: List publishers (staff-only)
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: optional name search
 *     responses:
 *       200: { description: OK }
 */
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (q) {
      const [rows] = await mysqlPool.query(
        'SELECT publisher_id AS id, name, address FROM publishers WHERE name LIKE ? ORDER BY name',
        [`%${q}%`]
      );
      return res.json(rows);
    }
    const [rows] = await mysqlPool.query(
      'SELECT publisher_id AS id, name, address FROM publishers ORDER BY name'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /publishers/{id}:
 *   get:
 *     tags: [Publishers]
 *     summary: Get one publisher (staff-only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const [[row]] = await mysqlPool.query(
      'SELECT publisher_id AS id, name, address FROM publishers WHERE publisher_id=?',
      [id]
    );
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /publishers:
 *   post:
 *     tags: [Publishers]
 *     summary: Create publisher (staff-only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               address: { type: string }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Duplicate name }
 */
router.post('/', async (req, res) => {
  const { name, address } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const [r] = await mysqlPool.query(
      'INSERT INTO publishers (name, address) VALUES (?, ?)',
      [name.trim(), address ?? null]
    );
    res.status(201).json({ id: r.insertId, name: name.trim(), address: address ?? null });
  } catch (e) {
    if (String(e.code) === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Publisher name already exists' });
    }
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

/**
 * @openapi
 * /publishers/{id}:
 *   put:
 *     tags: [Publishers]
 *     summary: Update publisher (staff-only)
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
 *               name: { type: string }
 *               address: { type: string }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 *       409: { description: Duplicate name }
 */
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, address } = req.body || {};
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const [r] = await mysqlPool.query(
      'UPDATE publishers SET name = COALESCE(?, name), address = COALESCE(?, address) WHERE publisher_id = ?',
      [name?.trim() ?? null, address ?? null, id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });

    const [[row]] = await mysqlPool.query(
      'SELECT publisher_id AS id, name, address FROM publishers WHERE publisher_id=?',
      [id]
    );
    res.json(row);
  } catch (e) {
    if (String(e.code) === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Publisher name already exists' });
    }
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

/**
 * @openapi
 * /publishers/{id}:
 *   delete:
 *     tags: [Publishers]
 *     summary: Delete publisher (staff-only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Deleted }
 *       409: { description: In use (FK constraint) }
 */
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const [r] = await mysqlPool.query('DELETE FROM publishers WHERE publisher_id = ?', [id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    if (String(e.code) === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'Publisher is referenced by one or more books' });
    }
    res.status(400).json({ error: e.sqlMessage || e.message });
  }
});

export default router;
