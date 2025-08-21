import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();
console.log("MONGO_URI from .env:", process.env.MONGO_URI);
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