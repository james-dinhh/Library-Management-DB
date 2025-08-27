import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function testAnalytics() {
  try {
    await client.connect();
    console.log('Testing MongoDB Analytics...\n');
    
    const db = client.db(process.env.MONGO_DB || 'smart_library');
    const col = db.collection('reading_sessions'); 
    
    // Average Session Time Per User
    console.log('1. Average Session Time Per User:');
    const avgTimes = await col.aggregate([
      {
        $match: { 
          endTime: { $ne: null }
        }
      },
      {
        $project: {
          userId: 1,
          durationMs: {
            $max: [
              0,
              { $subtract: [ { $ifNull: ['$endTime', '$$NOW'] }, '$startTime' ] }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$userId',
          avgSessionMs: { $avg: '$durationMs' },
          sessions: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          sessions: 1,
          avgSessionMinutes: { $round: [ { $divide: ['$avgSessionMs', 60000] }, 2 ] }
        }
      },
      { $sort: { avgSessionMinutes: -1 } }
    ]).toArray();
    console.log(avgTimes);
    
    // Most Highlighted Books
    console.log('\n2. Most Highlighted Books:');
    const highlighted = await col.aggregate([
      {
        $addFields: {
          highlightCount: {
            $cond: [
              { $isArray: '$highlights' },
              { $size: { $ifNull: ['$highlights', []] } },
              { $toInt: { $ifNull: ['$highlights', 0] } }
            ]
          }
        }
      },
      { $group: { _id: '$bookId', totalHighlights: { $sum: '$highlightCount' } } },
      { $project: { _id: 0, bookId: '$_id', totalHighlights: 1 } },
      { $sort: { totalHighlights: -1 } },
      { $limit: 10 }
    ]).toArray();
    console.log(highlighted);
    
    // Top Books by Reading Time
    console.log('\n3. Top Books by Reading Time:');
    const topBooks = await col.aggregate([
      {
        $match: { endTime: { $ne: null } }
      },
      {
        $project: {
          bookId: 1,
          durationMs: {
            $max: [
              0,
              { $subtract: [ { $ifNull: ['$endTime', '$$NOW'] }, '$startTime' ] }
            ]
          }
        }
      },
      { $group: { _id: '$bookId', totalReadingMs: { $sum: '$durationMs' }, sessions: { $sum: 1 } } },
      {
        $project: {
          _id: 0,
          bookId: '$_id',
          sessions: 1,
          totalReadingHours: { $round: [ { $divide: ['$totalReadingMs', 3600000] }, 2 ] }
        }
      },
      { $sort: { totalReadingHours: -1 } },
      { $limit: 10 }
    ]).toArray();
    console.log(topBooks);
    
    // Reading Patterns by Device
    console.log('\n4. Reading Patterns by Device:');
    const devicePatterns = await col.aggregate([
      {
        $addFields: {
          durationMs: {
            $cond: {
              if: { $ne: ['$endTime', null] },
              then: { $subtract: ['$endTime', '$startTime'] },
              else: null
            }
          }
        }
      },
      {
        $group: {
          _id: '$device',
          totalSessions: { $sum: 1 },
          avgPagesPerSession: { $avg: '$pages_read' },
          avgSessionMinutes: { 
            $avg: { 
              $cond: {
                if: { $ne: ['$durationMs', null] },
                then: { $divide: ['$durationMs', 60000] },
                else: null
              }
            }
          },
          totalHighlights: { $sum: { $size: { $ifNull: ['$highlights', []] } } }
        }
      },
      { $sort: { totalSessions: -1 } }
    ]).toArray();
    console.log(devicePatterns);
    
  } catch (error) {
    console.error('Error running analytics:', error);
  } finally {
    await client.close();
    process.exit(0);
  }
}

testAnalytics();