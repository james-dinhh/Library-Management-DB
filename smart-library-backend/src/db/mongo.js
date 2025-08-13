import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const uri = process.env.MONGO_URI; // Note: changed from MONGODB_URI to MONGO_URI to match your .env
const client = new MongoClient(uri);

export async function connectMongo() {
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    return client;
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    throw err;
  }
}

// Export the client as well in case it's needed elsewhere
export { client };