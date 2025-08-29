import { Router } from 'express';
import { mysqlPool } from '../db/mysql.js';

const router = Router();

/**
 * @openapi
 * /books:
 *   get:
 *     tags:
 *       - Books
 *     summary: List all books
 *     description: Returns a list of books with optional filters.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search text (title, genre, publisher)
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, retired]
 *       - in: query
 *         name: publisherId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number (1-based). When provided with pageSize, pagination is applied.
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Page size. When provided, pagination is applied (defaults page to 1 if not set).
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, genre, publishedYear, publisher, copiesAvailable, copiesTotal, status, rating, ratingsCount]
 *         description: Sort field (default: title)
 *       - in: query
 *         name: sortDir
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction (default: asc)
 *     responses:
 *       200:
 *         description: List of books
 */
/**
 * GET /books
 * Optional query params:
 *   q=search text (matches title/genre/publisher name)
 *   genre=Software
 *   status=active|retired
 *   publisherId=1
 */
router.get('/', async (req, res) => {
  const { q, genre, status, publisherId } = req.query;
  // Optional pagination and sorting
  const pageRaw = req.query.page;
  const pageSizeRaw = req.query.pageSize || req.query.limit; // allow `limit` alias
  const sortByRaw = req.query.sortBy;
  const sortDirRaw = req.query.sortDir || req.query.order;

  const page = pageRaw ? Math.max(1, Number(pageRaw)) : undefined;
  const pageSize = pageSizeRaw ? Math.min(100, Math.max(1, Number(pageSizeRaw))) : undefined;
  const offset = pageSize ? ((page || 1) - 1) * pageSize : undefined;

  // Whitelist sort fields to prevent SQL injection
  const sortMap = {
    title: 'b.title',
    genre: 'b.genre',
    publishedYear: 'b.published_year',
    publisher: 'p.name',
    copiesAvailable: 'b.copies_available',
    copiesTotal: 'b.copies_total',
    status: 'b.status',
    rating: 'b.avg_rating',
    ratingsCount: 'b.ratings_count',
  };
  const sortKey = typeof sortByRaw === 'string' && sortMap[sortByRaw] ? sortMap[sortByRaw] : 'b.title';
  const sortDir = typeof sortDirRaw === 'string' && String(sortDirRaw).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  // Build dynamic WHERE with parameter array
  const where = [];
  const params = [];

  if (q) {
    where.push('(b.title LIKE ? OR b.genre LIKE ? OR p.name LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (genre) {
    where.push('b.genre = ?');
    params.push(genre);
  }
  if (status) {
    where.push('b.status = ?');
    params.push(status);
  }
  if (publisherId) {
    where.push('b.publisher_id = ?');
    params.push(Number(publisherId));
  }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // One-shot query; authors aggregated as JSON array
  const sqlBase = `
    SELECT
      b.book_id                AS id,
      b.title,
      b.genre,
      b.published_year,
      p.name                   AS publisher,
      b.cover_image_url,
      b.copies_total,
      b.copies_available,
      b.status,
      b.avg_rating,
      b.ratings_count,
      (
        SELECT JSON_ARRAYAGG(name)
        FROM (
          SELECT a.name
          FROM book_authors ba
          JOIN authors a ON a.author_id = ba.author_id
          WHERE ba.book_id = b.book_id
          ORDER BY a.name
        ) AS ordered_authors
      ) AS authors_json
    FROM books b
    JOIN publishers p ON p.publisher_id = b.publisher_id
    ${whereSQL}
    ORDER BY ${sortKey} ${sortDir}
  `;

  const sql = pageSize ? `${sqlBase} LIMIT ? OFFSET ?` : `${sqlBase}`;

  try {
    // If paginating, also fetch a total count for convenience
    if (pageSize) {
      const countSql = `
        SELECT COUNT(*) AS total
        FROM books b
        JOIN publishers p ON p.publisher_id = b.publisher_id
        ${whereSQL}
      `;
      const [countRows] = await mysqlPool.query(countSql, params);
      const total = Array.isArray(countRows) && countRows[0] ? Number(countRows[0].total) : 0;
      res.set('X-Total-Count', String(total));
    }

    const execParams = pageSize ? [...params, pageSize, offset] : params;
    const [rows] = await mysqlPool.query(sql, execParams);
    const data = rows.map(r => ({
      id: r.id,
      title: r.title,
      authors: (() => {
        if (r.authors_json == null) return [];
        if (Array.isArray(r.authors_json)) return r.authors_json;
        try {
          const parsed = JSON.parse(r.authors_json);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [r.authors_json];
        }
      })(),
      publisher: r.publisher,
      genre: r.genre,
      publishedYear: r.published_year ?? null,
      coverImageUrl: r.cover_image_url ?? null,
      totalCopies: r.copies_total,
      copiesAvailable: r.copies_available,
      status: r.status,                    // 'active' | 'retired'
      rating: r.avg_rating,                // number | null
      ratingsCount: r.ratings_count        // number
    }));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
