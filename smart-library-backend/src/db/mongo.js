import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const uri = process.env.MONGO_URI;

const client = new MongoClient(uri);

async function connectMongo() {
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}

// Export the client and connection function
export { client, connectMongo };