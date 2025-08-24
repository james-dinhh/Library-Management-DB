import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectMongo, ReadingSession } from '../src/db/mongo.js';

dotenv.config();

const sampleReadingSessions = [
  {
    user_id: 1, // Alice Nguyen
    book_id: 1, // The Bamboo Path
    session_start: new Date('2025-08-03T14:00:00Z'),
    session_end: new Date('2025-08-03T15:30:00Z'),
    device: 'tablet',
    pages_read: 25,
    total_time_minutes: 90, 
    highlights: [
      { page: 12, text: 'The bamboo swayed gently in the morning breeze.' },
      { page: 18, text: 'Memory is like water - it finds its own path.' }
    ]
  },
  {
    user_id: 1, // Alice Nguyen
    book_id: 1, // The Bamboo Path
    session_start: new Date('2025-08-04T19:00:00Z'),
    session_end: new Date('2025-08-04T20:45:00Z'),
    device: 'mobile',
    pages_read: 30,
    total_time_minutes: 105, 
    highlights: [
      { page: 45, text: 'Wisdom comes from understanding, not just knowing.' }
    ]
  },
  {
    user_id: 3, // Chi Le
    book_id: 3, // Echoes of the Past
    session_start: new Date('2025-08-05T10:00:00Z'),
    session_end: new Date('2025-08-05T12:00:00Z'),
    device: 'desktop',
    pages_read: 40,
    total_time_minutes: 120, // 2 hours = 120 minutes
    highlights: [
      { page: 5, text: 'History repeats itself in patterns we choose to ignore.' },
      { page: 22, text: 'The past whispers lessons to those who listen.' },
      { page: 35, text: 'Cultural heritage is our compass for the future.' }
    ]
  },
  {
    user_id: 3, // Chi Le
    book_id: 1, // The Bamboo Path
    session_start: new Date('2025-08-06T16:00:00Z'),
    session_end: null, // Still reading
    device: 'mobile',
    pages_read: 15,
    total_time_minutes: null, 
    highlights: []
  },
  {
    user_id: 1, // Alice Nguyen
    book_id: 3, // Echoes of the Past
    session_start: new Date('2025-08-07T09:00:00Z'),
    session_end: new Date('2025-08-07T10:30:00Z'),
    device: 'tablet',
    pages_read: 20,
    total_time_minutes: 90, 
    highlights: [
      { page: 8, text: 'Archaeological evidence speaks louder than legends.' }
    ]
  }
];

async function insertSampleData() {
  try {
    await connectMongo();
    
    // Clear existing data
    await ReadingSession.deleteMany({});
    console.log('Cleared existing reading sessions');
    
    // Insert sample data
    await ReadingSession.insertMany(sampleReadingSessions);
    console.log('Sample reading sessions inserted successfully!');
    
    // Display inserted data with timing info
    const sessions = await ReadingSession.find({}).sort({ session_start: 1 });
    console.log('\nInserted Sessions:');
    sessions.forEach(session => {
      const timeInfo = session.total_time_minutes ? `${session.total_time_minutes} min` : 'ongoing';
      console.log(`- User ${session.user_id}, Book ${session.book_id}: ${session.pages_read} pages, ${session.highlights.length} highlights, ${timeInfo}`);
    });
    
  } catch (error) {
    console.error('Error inserting sample data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

insertSampleData();