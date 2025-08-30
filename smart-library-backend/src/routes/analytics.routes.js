import { Router } from 'express';
import { connectMongo, ReadingSession } from '../db/mongo.js';
import { mysqlPool } from '../db/mysql.js';

const router = Router();

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function dateMatch(start, end) {
  const match = {};
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (startDate) match.startTime = { ...(match.startTime || {}), $gte: startDate };
  if (endDate) match.startTime = { ...(match.startTime || {}), $lte: endDate };
  return match;
}

// Helpers to enrich analytics with relational data from MySQL
async function fetchUserNames(userIds = []) {
  if (!Array.isArray(userIds) || userIds.length === 0) return {};
  try {
    const [rows] = await mysqlPool.query(
      `SELECT user_id, name FROM users WHERE user_id IN (${userIds.map(() => '?').join(',')})`,
      userIds
    );
    const map = {};
    for (const r of rows) map[r.user_id] = r.name;
    return map;
  } catch (e) {
    return {};
  }
}

async function fetchBookTitles(bookIds = []) {
  if (!Array.isArray(bookIds) || bookIds.length === 0) return {};
  try {
    const [rows] = await mysqlPool.query(
      `SELECT book_id, title FROM books WHERE book_id IN (${bookIds.map(() => '?').join(',')})`,
      bookIds
    );
    const map = {};
    for (const r of rows) map[r.book_id] = r.title;
    return map;
  } catch (e) {
    return {};
  }
}

// GET /analytics/avg-session-time-per-user?start=&end=&limit=
/**
 * @openapi
 * /analytics/avg-session-time-per-user:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Average session time per user (minutes)
 *     description: |
 *       Aggregates reading sessions to compute the average session duration for each user, in minutes.
 *       Sessions without an endTime are treated as ongoing and measured up to the time of the query.
 *       Supports optional date range filtering by session start time.
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: ISO date/time to filter sessions with startTime >= start
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: ISO date/time to filter sessions with startTime <= end
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           minimum: 1
 *           maximum: 1000
 *         required: false
 *         description: Max number of results to return
 *     responses:
 *       200:
 *         description: Aggregated results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 start:
 *                   type: string
 *                   nullable: true
 *                 end:
 *                   type: string
 *                   nullable: true
 *                 count:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: number
 *                       userName:
 *                         type: string
 *                         nullable: true
 *                       sessions:
 *                         type: integer
 *                       avgSessionMinutes:
 *                         type: number
 *             examples:
 *               sample:
 *                 value:
 *                   start: 2025-01-01T00:00:00.000Z
 *                   end: 2025-08-31T23:59:59.999Z
 *                   count: 2
 *                   results:
 *                     - userId: 101
 *                       userName: Alice Johnson
 *                       sessions: 12
 *                       avgSessionMinutes: 34.5
 *                     - userId: 102
 *                       userName: Bob Lee
 *                       sessions: 7
 *                       avgSessionMinutes: 28.75
 *       500:
 *         description: Internal server error
 */
router.get('/avg-session-time-per-user', async (req, res) => {
  try {
    await connectMongo();
    const { start, end } = req.query;
    const limit = Math.min(parseInt(req.query.limit ?? '100', 10), 1000);

    const pipeline = [
      Object.keys(dateMatch(start, end)).length ? { $match: dateMatch(start, end) } : null,
      {
        $project: {
          userId: 1,
          durationMs: {
            $max: [
              0,
              { $subtract: [ { $ifNull: ['$endTime', '$$NOW'] }, '$startTime' ] }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$userId',
          avgSessionMs: { $avg: '$durationMs' },
          sessions: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          sessions: 1,
          avgSessionMinutes: { $round: [ { $divide: ['$avgSessionMs', 60000] }, 2 ] }
        }
      },
      { $sort: { avgSessionMinutes: -1 } },
      { $limit: limit }
    ].filter(Boolean);

  const docs = await ReadingSession.aggregate(pipeline);
  // Enrich with user names from MySQL
  const userIds = [...new Set(docs.map(d => d.userId).filter(v => Number.isFinite(v)))];
  const userMap = await fetchUserNames(userIds);
  const enriched = docs.map(d => ({ ...d, userName: userMap[d.userId] || null }));
  res.json({ start, end, count: docs.length, results: enriched });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /analytics/most-highlighted-books?start=&end=&limit=
/**
 * @openapi
 * /analytics/most-highlighted-books:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Most highlighted books
 *     description: |
 *       Aggregates reading sessions to compute the total number of highlights per book.
 *       Handles sessions where `highlights` is an array of highlight entries or a numeric count field.
 *       Supports optional date range filtering by session start time.
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: ISO date/time to filter sessions with startTime >= start
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: ISO date/time to filter sessions with startTime <= end
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         required: false
 *         description: Max number of results to return
 *     responses:
 *       200:
 *         description: Aggregated results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 start:
 *                   type: string
 *                   nullable: true
 *                 end:
 *                   type: string
 *                   nullable: true
 *                 count:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bookId:
 *                         type: number
 *                       title:
 *                         type: string
 *                         nullable: true
 *                       totalHighlights:
 *                         type: integer
 *             examples:
 *               sample:
 *                 value:
 *                   start: 2025-01-01T00:00:00.000Z
 *                   end: 2025-08-31T23:59:59.999Z
 *                   count: 2
 *                   results:
 *                     - bookId: 2001
 *                       title: The Great Adventure
 *                       totalHighlights: 123
 *                     - bookId: 2002
 *                       title: Learning TypeScript
 *                       totalHighlights: 87
 *       500:
 *         description: Internal server error
 */
router.get('/most-highlighted-books', async (req, res) => {
  try {
    await connectMongo();
    const { start, end } = req.query;
    const limit = Math.min(parseInt(req.query.limit ?? '10', 10), 100);

    const pipeline = [
      Object.keys(dateMatch(start, end)).length ? { $match: dateMatch(start, end) } : null,
      {
        $addFields: {
          highlightCount: {
            $cond: [
              { $isArray: '$highlights' },
              { $size: { $ifNull: ['$highlights', []] } },
              { $toInt: { $ifNull: ['$highlights', 0] } }
            ]
          }
        }
      },
      { $group: { _id: '$bookId', totalHighlights: { $sum: '$highlightCount' } } },
      { $project: { _id: 0, bookId: '$_id', totalHighlights: 1 } },
      { $sort: { totalHighlights: -1 } },
      { $limit: limit }
    ].filter(Boolean);

  const docs = await ReadingSession.aggregate(pipeline);
  // Enrich with book titles from MySQL
  const bookIds = [...new Set(docs.map(d => d.bookId).filter(v => Number.isFinite(v)))];
  const bookMap = await fetchBookTitles(bookIds);
  const enriched = docs.map(d => ({ ...d, title: bookMap[d.bookId] || null }));
  res.json({ start, end, count: docs.length, results: enriched });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /analytics/top-books-by-reading-time?start=&end=&limit=
/**
 * @openapi
 * /analytics/top-books-by-reading-time:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Top books by total reading time (hours)
 *     description: |
 *       Aggregates reading sessions to compute total reading time per book, expressed in hours.
 *       Sessions without an endTime are treated as ongoing and measured up to the time of the query.
 *       Supports optional date range filtering by session start time.
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: ISO date/time to filter sessions with startTime >= start
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: ISO date/time to filter sessions with startTime <= end
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         required: false
 *         description: Max number of results to return
 *     responses:
 *       200:
 *         description: Aggregated results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 start:
 *                   type: string
 *                   nullable: true
 *                 end:
 *                   type: string
 *                   nullable: true
 *                 count:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bookId:
 *                         type: number
 *                       title:
 *                         type: string
 *                         nullable: true
 *                       sessions:
 *                         type: integer
 *                       totalReadingHours:
 *                         type: number
 *             examples:
 *               sample:
 *                 value:
 *                   start: 2025-01-01T00:00:00.000Z
 *                   end: 2025-08-31T23:59:59.999Z
 *                   count: 2
 *                   results:
 *                     - bookId: 2001
 *                       title: The Great Adventure
 *                       sessions: 45
 *                       totalReadingHours: 56.75
 *                     - bookId: 2002
 *                       title: Learning TypeScript
 *                       sessions: 12
 *                       totalReadingHours: 18.5
 *       500:
 *         description: Internal server error
 */
router.get('/top-books-by-reading-time', async (req, res) => {
  try {
    await connectMongo();
    const { start, end } = req.query;
    const limit = Math.min(parseInt(req.query.limit ?? '10', 10), 100);

    const pipeline = [
      Object.keys(dateMatch(start, end)).length ? { $match: dateMatch(start, end) } : null,
      {
        $project: {
          bookId: 1,
          durationMs: {
            $max: [
              0,
              { $subtract: [ { $ifNull: ['$endTime', '$$NOW'] }, '$startTime' ] }
            ]
          }
        }
      },
      { $group: { _id: '$bookId', totalReadingMs: { $sum: '$durationMs' }, sessions: { $sum: 1 } } },
      {
        $project: {
          _id: 0,
          bookId: '$_id',
          sessions: 1,
          totalReadingHours: { $round: [ { $divide: ['$totalReadingMs', 3600000] }, 2 ] }
        }
      },
      { $sort: { totalReadingHours: -1 } },
      { $limit: limit }
    ].filter(Boolean);

  const docs = await ReadingSession.aggregate(pipeline);
  // Enrich with book titles from MySQL
  const bookIds = [...new Set(docs.map(d => d.bookId).filter(v => Number.isFinite(v)))];
  const bookMap = await fetchBookTitles(bookIds);
  const enriched = docs.map(d => ({ ...d, title: bookMap[d.bookId] || null }));
  res.json({ start, end, count: docs.length, results: enriched });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;