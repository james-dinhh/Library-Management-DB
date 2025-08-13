import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error(
    'MONGODB_URI is not set. Please add it to your .env file (e.g., MONGODB_URI="mongodb://localhost:27017/smart_library").'
  );
}

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

let _db = null;

/**
 * Connect to Mongo once and reuse the connection.
 * Returns the connected database instance.
 */
export async function connectMongo() {
  if (_db) return _db; // already connected

  await client.connect();

  // Prefer explicit DB name via env; otherwise let the URI’s default database apply.
  const dbName = process.env.MONGODB_DB && process.env.MONGODB_DB.trim()
    ? process.env.MONGODB_DB.trim()
    : undefined;

  _db = dbName ? client.db(dbName) : client.db();

  console.log(`Connected to MongoDB${dbName ? ` (db: ${_db.databaseName})` : ''}.`);
  return _db;
}

/** Get the DB after connectMongo() has been called during startup */
export function getMongoDb() {
  if (!_db) throw new Error('MongoDB not connected yet. Call connectMongo() during startup.');
  return _db;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await client.close();
    console.log('MongoDB connection closed.');
  } finally {
    process.exit(0);
  }
});
