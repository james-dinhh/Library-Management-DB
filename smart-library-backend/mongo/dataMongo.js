import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || "smart_library";

if (!uri) {
  console.error("[dataMongo] MONGO_URI is not set. Exiting.");
  process.exit(0);
}

const SHOULD_SEED =
  process.argv.includes("--seed") ||
  String(process.env.SEED_MONGO).toLowerCase() === "true";
const SHOULD_RESET =
  process.argv.includes("--reset") ||
  String(process.env.MONGO_RESET).toLowerCase() === "true";

const sampleReadingSessions = [
  {
    userId: 1, 
    bookId: 1, 
    startTime: new Date('2025-08-03T14:00:00Z'), 
    endTime: new Date('2025-08-03T15:30:00Z'), 
    device: 'tablet',
    pages_read: 25,
    highlights: [ 
      { page: 12, text: 'The bamboo swayed gently in the morning breeze.' },
      { page: 18, text: 'Memory is like water - it finds its own path.' }
    ]
  },
  {
    userId: 1, 
    bookId: 1, 
    startTime: new Date('2025-08-04T19:00:00Z'),
    endTime: new Date('2025-08-04T20:45:00Z'),
    device: 'mobile',
    pages_read: 30,
    highlights: [
      { page: 45, text: 'Wisdom comes from understanding, not just knowing.' }
    ]
  },
  {
    userId: 3, 
    bookId: 3, 
    startTime: new Date('2025-08-05T10:00:00Z'),
    endTime: new Date('2025-08-05T12:00:00Z'),
    device: 'desktop',
    pages_read: 40,
    highlights: [
      { page: 5, text: 'History repeats itself in patterns we choose to ignore.' },
      { page: 22, text: 'The past whispers lessons to those who listen.' },
      { page: 35, text: 'Cultural heritage is our compass for the future.' }
    ]
  },
  {
    userId: 3, 
    bookId: 1, 
    startTime: new Date('2025-08-06T16:00:00Z'),
    endTime: new Date('2025-08-07T16:00:00Z'), 
    device: 'mobile',
    pages_read: 15,
    highlights: [] 
  },
  {
    userId: 1, 
    bookId: 3, 
    startTime: new Date('2025-08-07T09:00:00Z'),
    endTime: new Date('2025-08-07T10:30:00Z'),
    device: 'tablet',
    pages_read: 20,
    highlights: [
      { page: 8, text: 'Archaeological evidence speaks louder than legends.' }
    ]
  },
];

async function withClient(fn) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    return await fn(db, client);
  } finally {
    await client.close();
  }
}

async function ensureIndexes(db) {
  await db.collection("reading_sessions").createIndex({ userId: 1, startTime: -1 });
  await db.collection("reading_sessions").createIndex({ bookId: 1, startTime: -1 });
}

async function seed(db) {
  const sessionsCol = db.collection("reading_sessions");
  // const ebooksCol = db.collection("ebooks");

  if (SHOULD_RESET) {
    console.warn("[dataMongo] --reset given: clearing old Mongo collections…");
    await sessionsCol.deleteMany({});
    await ebooksCol.deleteMany({});
  }

  if (sampleReadingSessions.length) {
    const result = await sessionsCol.insertMany(sampleReadingSessions, { ordered: false });
    console.log(`[dataMongo] Inserted ${result.insertedCount ?? Object.keys(result.insertedIds).length} sample sessions.`);
  } else {
    console.log("[dataMongo] No sample sessions to insert.");
  }
}

async function main() {
  await withClient(async (db) => {
    await ensureIndexes(db);

    if (!SHOULD_SEED) {
      console.log("[dataMongo] Seed flags not set; doing nothing. (Pass --seed to insert sample data.)");
      return;
    }

    await seed(db);
  });
}

main().catch((err) => {
  console.error("[dataMongo] Fatal error:", err);
  process.exit(1);
});
