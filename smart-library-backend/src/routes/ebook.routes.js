import { Router } from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const router = Router();
const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || "smart_library";

// GET /mongo-ebooks - fetch eBooks from MongoDB
router.get("/mongo-ebooks", async (req, res) => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const ebooks = await db.collection("ebooks").find({}).toArray();
    res.json(ebooks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch eBooks" });
  } finally {
    await client.close();
  }
});

// POST /sessions - log a reading session
router.post("/sessions", async (req, res) => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const result = await db.collection("reading_sessions").insertOne(req.body);
    res.status(201).json({ success: true, id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: "Failed to log session" });
  } finally {
    await client.close();
  }
});

// GET /sessions/:userId - get all sessions for a user
router.get("/sessions/:userId", async (req, res) => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const sessions = await db.collection("reading_sessions").find({ userId: Number(req.params.userId) }).toArray();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  } finally {
    await client.close();
  }
});

export default router;