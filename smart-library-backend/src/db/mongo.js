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
    console.error('Failed to connect', err);
  } finally {
    await client.close();
  }
}

connectMongo();