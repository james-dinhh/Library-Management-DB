import { Router } from "express";
import { MongoClient } from "mongodb";
import { mysqlPool } from "../db/mysql.js";
import dotenv from "dotenv";
dotenv.config();

const router = Router();
const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || "smart_library";

// Utility: get a fresh Mongo client per request
async function withMongo(fn) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    return await fn(db);
  } finally {
    await client.close();
  }
}

/**
 * GET /ebooks/mongo-ebooks
 * (Optional) Returns mirrored ebooks from Mongo.
 */
router.get("/mongo-ebooks", async (req, res) => {
  try {
    const ebooks = await withMongo(db => db.collection("ebooks").find({}).toArray());
    res.json(ebooks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch eBooks" });
  }
});

/**
 * POST /ebooks/sessions
 * Insert a reading session in Mongo, but first validate userId/bookId in MySQL.
 */
router.post("/sessions", async (req, res) => {
  const {
    userId,
    bookId,
    startTime,
    endTime,
    device,
    pages_read,
    highlights
  } = req.body || {};

  // Basic type checks
  const uId = Number(userId);
  const bId = Number(bookId);
  if (!Number.isFinite(uId) || !Number.isFinite(bId)) {
    return res.status(400).json({ error: "userId and bookId must be numbers" });
  }

  try {
    // 1) Validate existence in MySQL
    const [[userRow]] = await mysqlPool.query(
      "SELECT user_id, name FROM users WHERE user_id = ? LIMIT 1",
      [uId]
    );
    const [[bookRow]] = await mysqlPool.query(
      "SELECT book_id, title, status FROM books WHERE book_id = ? LIMIT 1",
      [bId]
    );

    if (!userRow) return res.status(400).json({ error: "Unknown userId" });
    if (!bookRow) return res.status(400).json({ error: "Unknown bookId" });
    if (bookRow.status === "retired") {
      return res.status(400).json({ error: "Book is retired; cannot log session" });
    }

    // 2) Build the session doc; snapshot selected fields for analytics speed
    const doc = {
      userId: uId,
      bookId: bId,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : null,
      device: device || null,
      pages_read: Number.isFinite(Number(pages_read)) ? Number(pages_read) : 0,
      highlights: Array.isArray(highlights) ? highlights : [],
      // Snapshots
      userName: userRow.name ?? null,
      bookTitle: bookRow.title ?? null
    };

    // 3) Insert into Mongo
    const result = await withMongo(db => db.collection("reading_sessions").insertOne(doc));
    res.status(201).json({ success: true, id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: "Failed to log session" });
  }
});

/**
 * GET /ebooks/sessions/:userId
 * Fetch user’s sessions from Mongo, then hydrate with book details from MySQL.
 */
router.get("/sessions/:userId", async (req, res) => {
  const uId = Number(req.params.userId);
  if (!Number.isFinite(uId)) return res.status(400).json({ error: "Invalid userId" });

  try {
    // 1) Pull sessions from Mongo
    const sessions = await withMongo(db =>
      db.collection("reading_sessions")
        .find({ userId: uId })
        .sort({ startTime: -1 })
        .toArray()
    );

    if (sessions.length === 0) return res.json([]);

    // 2) Batch collect bookIds & fetch from MySQL
    const bookIds = [...new Set(sessions.map(s => Number(s.bookId)).filter(Number.isFinite))];
    const placeholders = bookIds.map(() => "?").join(",");
    const [bookRows] = await mysqlPool.query(
      `SELECT book_id, title, genre, published_year, status
       FROM books
       WHERE book_id IN (${placeholders})`,
      bookIds
    );
    const bookMap = new Map(bookRows.map(r => [Number(r.book_id), r]));

    // (Optional) Validate the user still exists (might have been deleted)
    const [[userRow]] = await mysqlPool.query(
      "SELECT user_id, name FROM users WHERE user_id = ? LIMIT 1",
      [uId]
    );
    const userName = userRow?.name ?? null;

    // 3) Hydrate and return
    const hydrated = sessions.map(s => {
      const b = bookMap.get(Number(s.bookId));
      return {
        ...s,
        userName: s.userName ?? userName,
        book: b
          ? {
              id: Number(b.book_id),
              title: b.title,
              genre: b.genre,
              publishedYear: b.published_year,
              status: b.status
            }
          : null
      };
    });

    res.json(hydrated);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

export default router;
