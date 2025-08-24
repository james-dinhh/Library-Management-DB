import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();
const uri = process.env.MONGODB_URI;

// Reading Sessions Schema 
const readingSessionSchema = new mongoose.Schema({
  user_id: { type: Number, required: true }, // Reference to SQL users table
  book_id: { type: Number, required: true }, // Reference to SQL books table
  session_start: { type: Date, required: true },
  session_end: { type: Date },
  device: { type: String, required: true }, 
  pages_read: { type: Number, default: 0 },
  highlights: [{
    page: { type: Number, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  total_time_minutes: { type: Number }, // Calculated field
  created_at: { type: Date, default: Date.now }
});

// Calculate total time before saving
readingSessionSchema.pre('save', function(next) {
  if (this.session_start && this.session_end) {
    this.total_time_minutes = Math.round((this.session_end - this.session_start) / (1000 * 60));
  }
  next();
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

