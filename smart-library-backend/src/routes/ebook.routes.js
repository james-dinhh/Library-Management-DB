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
 * @openapi
 * /ebooks/mongo-ebooks:
 *   get:
 *     tags:
 *       - eBooks
 *     summary: List mirrored eBooks from MongoDB
 *     description: Returns eBook documents mirrored in the Mongo `ebooks` collection.
 *     responses:
 *       200:
 *         description: Array of eBook documents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *             examples:
 *               sample:
 *                 value:
 *                   - _id: "64f0a1bc2c7d9fa5b12c34de"
 *                     bookId: 2001
 *                     title: The Great Adventure
 *                     author: Jane Doe
 *                     format: epub
 *                   - _id: "64f0a1bc2c7d9fa5b12c34df"
 *                     bookId: 2002
 *                     title: Learning TypeScript
 *                     author: Alex Smith
 *                     format: pdf
 *       500:
 *         description: Failed to fetch eBooks
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
 * @openapi
 * /ebooks/sessions:
 *   post:
 *     tags:
 *       - eBooks
 *     summary: Log a reading session
 *     description: Inserts a reading session into MongoDB after validating the userId and bookId in MySQL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - bookId
 *             properties:
 *               userId:
 *                 type: number
 *               bookId:
 *                 type: number
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: Defaults to server time if not provided
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               device:
 *                 type: string
 *                 nullable: true
 *               pages_read:
 *                 type: number
 *                 description: Numeric count of pages read in the session (defaults to 0)
 *               highlights:
 *                 type: array
 *                 items:
 *                   type: object
 *           examples:
 *             sample:
 *               value:
 *                 userId: 101
 *                 bookId: 2001
 *                 startTime: 2025-08-28T10:00:00.000Z
 *                 endTime: 2025-08-28T10:45:10.000Z
 *                 device: ios
 *                 pages_read: 22
 *                 highlights:
 *                   - { page: 12, text: "A key insight" }
 *     responses:
 *       201:
 *         description: Session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 id:
 *                   type: string
 *             examples:
 *               created:
 *                 value:
 *                   success: true
 *                   id: "64f0a1bc2c7d9fa5b12c3500"
 *       400:
 *         description: Validation error (unknown userId/bookId or invalid payload)
 *       500:
 *         description: Failed to log session
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
 * @openapi
 * /ebooks/sessions/{userId}:
 *   get:
 *     tags:
 *       - eBooks
 *     summary: Get a user's reading sessions
 *     description: Fetches reading sessions for a user from MongoDB and hydrates each with book details from MySQL.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user's numeric ID
 *     responses:
 *       200:
 *         description: Array of hydrated reading sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   userId:
 *                     type: number
 *                   bookId:
 *                     type: number
 *                   startTime:
 *                     type: string
 *                     format: date-time
 *                   endTime:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                   device:
 *                     type: string
 *                     nullable: true
 *                   pages_read:
 *                     type: number
 *                   highlights:
 *                     type: array
 *                     items:
 *                       type: object
 *                   userName:
 *                     type: string
 *                     nullable: true
 *                   bookTitle:
 *                     type: string
 *                     nullable: true
 *                   book:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       id:
 *                         type: number
 *                       title:
 *                         type: string
 *                       genre:
 *                         type: string
 *                         nullable: true
 *                       publishedYear:
 *                         type: integer
 *                         nullable: true
 *                       status:
 *                         type: string
 *                         nullable: true
 *             examples:
 *               sample:
 *                 value:
 *                   - _id: "64f0a1bc2c7d9fa5b12c3600"
 *                     userId: 101
 *                     bookId: 2001
 *                     startTime: 2025-08-28T10:00:00.000Z
 *                     endTime: 2025-08-28T10:45:10.000Z
 *                     device: ios
 *                     pages_read: 22
 *                     highlights:
 *                       - { page: 12, text: "A key insight" }
 *                     userName: Alice Johnson
 *                     bookTitle: The Great Adventure
 *                     book:
 *                       id: 2001
 *                       title: The Great Adventure
 *                       genre: Fiction
 *                       publishedYear: 2019
 *                       status: available
 *                   - _id: "64f0a1bc2c7d9fa5b12c3601"
 *                     userId: 101
 *                     bookId: 2002
 *                     startTime: 2025-08-27T09:00:00.000Z
 *                     endTime: null
 *                     device: web
 *                     pages_read: 10
 *                     highlights: []
 *                     userName: Alice Johnson
 *                     bookTitle: Learning TypeScript
 *                     book:
 *                       id: 2002
 *                       title: Learning TypeScript
 *                       genre: Technical
 *                       publishedYear: 2023
 *                       status: available
 *       400:
 *         description: Invalid userId
 *       500:
 *         description: Failed to fetch sessions
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
