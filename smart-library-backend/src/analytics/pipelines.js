import { ReadingSession } from '../db/mongo.js';

// Average session time per user
export async function getAverageSessionTimePerUser() {
  return await ReadingSession.aggregate([
    {
      $match: { 
        session_end: { $ne: null },
        total_time_minutes: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: '$user_id',
        avgSessionTime: { $avg: '$total_time_minutes' },
        totalSessions: { $sum: 1 },
        totalReadingTime: { $sum: '$total_time_minutes' }
      }
    },
    {
      $sort: { avgSessionTime: -1 }
    }
  ]);
}

// Most highlighted books
export async function getMostHighlightedBooks() {
  return await ReadingSession.aggregate([
    {
      $unwind: '$highlights'
    },
    {
      $group: {
        _id: '$book_id',
        totalHighlights: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user_id' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $sort: { totalHighlights: -1 }
    },
    {
      $limit: 10
    }
  ]);
}

// Top 10 books by total reading time
export async function getTop10BooksByReadingTime() {
  return await ReadingSession.aggregate([
    {
      $match: { 
        total_time_minutes: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: '$book_id',
        totalReadingTime: { $sum: '$total_time_minutes' },
        totalSessions: { $sum: 1 },
        uniqueReaders: { $addToSet: '$user_id' },
        avgSessionTime: { $avg: '$total_time_minutes' }
      }
    },
    {
      $addFields: {
        uniqueReaderCount: { $size: '$uniqueReaders' }
      }
    },
    {
      $sort: { totalReadingTime: -1 }
    },
    {
      $limit: 10
    }
  ]);
}

// Reading patterns by device
export async function getReadingPatternsByDevice() {
  return await ReadingSession.aggregate([
    {
      $group: {
        _id: '$device',
        totalSessions: { $sum: 1 },
        avgPagesPerSession: { $avg: '$pages_read' },
        avgSessionTime: { $avg: '$total_time_minutes' },
        totalHighlights: { $sum: { $size: '$highlights' } }
      }
    },
    {
      $sort: { totalSessions: -1 }
    }
  ]);
}