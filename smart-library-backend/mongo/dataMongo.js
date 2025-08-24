import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

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
    endTime: null, 
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
  }
];

async function insertSampleData() {
  try {
    await client.connect();
    console.log('Connected to MongoDB for Analytics!');
    
    // MongoDB path setting
    const db = client.db(process.env.MONGO_DB || 'smart_library');
    const col = db.collection('reading_sessions'); 
    
    // Clear existing data, can remove later for production
    await col.deleteMany({});
    console.log('Cleared existing reading sessions');
    
    // Insert sample data
    await col.insertMany(sampleReadingSessions);
    console.log('Sample reading sessions inserted successfully!');
    
    // Display inserted data
    const sessions = await col.find({}).sort({ startTime: 1 }).toArray();
    console.log('\nInserted Sessions:');
    sessions.forEach(session => {
      const timeInfo = session.endTime ? 
        `${Math.round((session.endTime - session.startTime) / (1000 * 60))} min` : 
        'ongoing';
      console.log(`- User ${session.userId}, Book ${session.bookId}: ${session.pages_read} pages, ${session.highlights.length} highlights, ${timeInfo}`);
    });
    
  } catch (error) {
    console.error('Error inserting sample data:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

insertSampleData();