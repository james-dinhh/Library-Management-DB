import fs from 'fs';
import path from 'path';
import { mysqlPool } from '../src/db/mysql.js';

async function runSQLFile(filename) {
  try {
    console.log(`Running ${filename}...`);
    const filePath = path.join(process.cwd(), 'sql', filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    const connection = await mysqlPool.getConnection();
    
    // Use query() instead of execute() for complex SQL
    // Handle multiple statements by splitting properly
    if (filename === 'schema.sql') {
      // For schema, split by CREATE TABLE statements
      const tableStatements = sql.split(/(?=CREATE TABLE)/i).filter(stmt => stmt.trim().length > 0);
      
      for (const statement of tableStatements) {
        if (statement.trim() && statement.includes('CREATE TABLE')) {
          try {
            await connection.query(statement.trim());
            console.log(`   Created table from statement`);
          } catch (err) {
            console.log(`   Error in statement: ${err.message}`);
          }
        }
      }
    } else {
      // For functions, procedures, triggers - run as single block
      try {
        await connection.query(sql);
        console.log(`   ${filename} executed successfully!`);
      } catch (err) {
        console.log(`   Error in ${filename}: ${err.message}`);
      }
    }
    
    connection.release();
    
  } catch (error) {
    console.error(` Error running ${filename}:`, error.message);
  }
}

async function setupDatabase() {
  try {
    // Run files in order
    await runSQLFile('schema.sql');
    
    // Check what tables were created
    const connection = await mysqlPool.getConnection();
    const [tables] = await connection.execute('SHOW TABLES FROM smart_library');
    console.log('\n Tables created:', tables.map(t => Object.values(t)[0]));
    
    if (tables.length > 0) {
      console.log('Schema created successfully! Now running additional files...');
      
      // Only run other files if schema was successful
      await runSQLFile('functions.sql');
      await runSQLFile('procedures.sql'); 
      await runSQLFile('triggers.sql');
    } else {
      console.log(' No tables created. Check schema.sql file.');
    }
    
    connection.release();
    await mysqlPool.end();
    console.log('\n Database setup complete!');
    
  } catch (error) {
    console.error('Setup failed:', error.message);
  }
}

setupDatabase();