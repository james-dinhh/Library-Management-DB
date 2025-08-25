import { mysqlPool } from '../src/db/mysql.js';

async function testConnection() {
  try {
    console.log('Testing MySQL connection');
    
    // Test the connection
    const connection = await mysqlPool.getConnection();
    console.log('Successfully connected to MySQL!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('Query test successful:', rows);
    
    // Check if smart_library database exists
    const [databases] = await connection.execute('SHOW DATABASES LIKE "smart_library"');
    if (databases.length > 0) {
      console.log('smart_library database found!');
      
      // Check tables in the database
      const [tables] = await connection.execute('SHOW TABLES FROM smart_library');
      console.log('Tables in smart_library:', tables.map(t => Object.values(t)[0]));
    } else {
      console.log('smart_library database not found. Please run the schema.sql file first.');
    }
    
    connection.release();
    await mysqlPool.end();
    
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
