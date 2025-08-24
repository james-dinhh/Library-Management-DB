import { connectMongo } from '../src/db/mongo.js';
import * as analytics from '../src/analytics/pipelines.js';

async function testAnalytics() {
  try {
    await connectMongo();    
    // Test average session time per user
    console.log('1. Average Session Time Per User:');
    const avgTimes = await analytics.getAverageSessionTimePerUser();
    console.log(avgTimes);
    
    console.log('\n2. Most Highlighted Books:');
    const highlighted = await analytics.getMostHighlightedBooks();
    console.log(highlighted);
    
    console.log('\n3. Top 10 Books by Reading Time:');
    const topBooks = await analytics.getTop10BooksByReadingTime();
    console.log(topBooks);
    
    console.log('\n4. Reading Patterns by Device:');
    const devicePatterns = await analytics.getReadingPatternsByDevice();
    console.log(devicePatterns);
    
  } catch (error) {
    console.error('Error running analytics:', error);
  } finally {
    process.exit(0);
  }
}

testAnalytics();