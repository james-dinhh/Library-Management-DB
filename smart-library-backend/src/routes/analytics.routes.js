import { Router } from 'express';
import { connectMongo, ReadingSession } from '../db/mongo.js';

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

// GET /analytics/avg-session-time-per-user?start=&end=&limit=
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
    res.json({ start, end, count: docs.length, results: docs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /analytics/most-highlighted-books?start=&end=&limit=
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
    res.json({ start, end, count: docs.length, results: docs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /analytics/top-books-by-reading-time?start=&end=&limit=
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
    res.json({ start, end, count: docs.length, results: docs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;