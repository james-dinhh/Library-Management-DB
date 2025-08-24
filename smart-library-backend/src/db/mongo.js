import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();
const uri = process.env.MONGODB_URI;

// Reading Sessions Schema - Updated field names
const readingSessionSchema = new mongoose.Schema({
  userId: { type: Number, required: true }, 
  bookId: { type: Number, required: true }, 
  startTime: { type: Date, required: true }, 
  endTime: { type: Date }, 
  device: { type: String, required: true },
  pages_read: { type: Number, default: 0 },
  highlights: [{
    page: { type: Number, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  created_at: { type: Date, default: Date.now }
});

export const ReadingSession = mongoose.model('ReadingSession', readingSessionSchema);

// Connect to MongoDB
export async function connectMongo() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB for Analytics!');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    throw err;
  }
}