import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { mysqlPool } from '../src/db/mysql.js';
import { spawn } from 'child_process';

const DB_NAME = process.env.MYSQL_DB || 'smart_library';
const SHOULD_RESET_DB = process.argv.includes('--reset') || /^true$/i.test(process.env.MYSQL_RESET_DB || '');

// Remove block comments /* ... */ and trim lines
function stripBlockComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '');
}

// Split simple SQL (no custom delimiters) into individual statements; ignore empty/comment-only
function splitBasicStatements(sql) {
  const noBlocks = stripBlockComments(sql);
  const lines = noBlocks
    .split(/\r?\n/)
    .filter(l => !/^\s*--/.test(l)) // drop line comments
    .join('\n');
  return lines
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// Parse SQL with DELIMITER changes (for functions/procedures/triggers)
// Returns an array of executable statements (without DELIMITER commands or USE statements)
function parseStatementsWithDelimiters(sql) {
  const noBlocks = stripBlockComments(sql);
  const lines = noBlocks.split(/\r?\n/);
  const stmts = [];
  let currentDelimiter = ';';
  let buffer = '';

  const pushBuffer = () => {
    const s = buffer.trim();
    if (s) stmts.push(s);
    buffer = '';
  };

  for (let raw of lines) {
    let line = raw; // keep original spacing for routines
    if (/^\s*USE\s+/i.test(line)) {
      continue;
    }
    // handle line comments
    if (/^\s*--/.test(line)) {
      continue;
    }
    const delimMatch = line.match(/^\s*DELIMITER\s+(.+)\s*$/i);
    if (delimMatch) {
      // switch delimiter; flush any pending buffer (rare, but safe)
      if (buffer.trim()) pushBuffer();
      currentDelimiter = delimMatch[1].trim();
      continue;
    }
    buffer += (buffer ? '\n' : '') + line;
    // Check if buffer ends with current delimiter (ignoring trailing whitespace)
    const trimmed = buffer.replace(/\s+$/g, '');
    if (
      currentDelimiter !== '' &&
      trimmed.endsWith(currentDelimiter)
    ) {
      // Remove the delimiter and push
      buffer = trimmed.slice(0, trimmed.length - currentDelimiter.length);
      pushBuffer();
    }
  }
  // push any residual buffer
  if (buffer.trim()) pushBuffer();
  return stmts;
}

async function resetDatabase() {
  const host = process.env.MYSQL_HOST;
  const port = process.env.MYSQL_PORT;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;

  const admin = await mysql.createConnection({ host, port, user, password });
  try {
    console.log(`\n Resetting database ${DB_NAME} ...`);
    await admin.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
    await admin.query(
      `CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
    );
    console.log(`   Database ${DB_NAME} created.`);
  } finally {
    await admin.end();
  }
}

async function runSQLFile(filename) {
  try {
    console.log(`Running ${filename}...`);
    const filePath = path.join(process.cwd(), 'sql', filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    const connection = await mysqlPool.getConnection();
    await connection.query(`USE \`${DB_NAME}\``);

    if (filename === 'schema.sql') {
      // Execute every statement individually (handles CREATE TABLE, CREATE INDEX, etc.)
      const statements = splitBasicStatements(sql);
      for (const stmt of statements) {
        try {
          await connection.query(stmt);
          if (/^\s*CREATE\s+TABLE/i.test(stmt)) {
            console.log(`   Created table`);
          } else if (/^\s*CREATE\s+INDEX/i.test(stmt)) {
            console.log(`   Created index`);
          }
        } catch (err) {
          console.log(`   Error in statement: ${err.message}`);
        }
      }
    } else {
      // functions.sql, procedures.sql, triggers.sql: parse with DELIMITER handling
      const statements = parseStatementsWithDelimiters(sql);
      for (const stmt of statements) {
        try {
          await connection.query(stmt);
        } catch (err) {
          console.log(`   Error executing routine statement: ${err.message}`);
        }
      }
      console.log(`   ${filename} processed (${statements.length} statements).`);
    }

    connection.release();
    
  } catch (error) {
    console.error(` Error running ${filename}:`, error.message);
  }
}

async function setupDatabase() {
  try {
    if (SHOULD_RESET_DB) {
      await resetDatabase();
    }
    // Run files in order
    await runSQLFile('schema.sql');
    
    // Check what tables were created
    const connection = await mysqlPool.getConnection();
    const [tables] = await connection.execute(`SHOW TABLES FROM \`${DB_NAME}\``);
    console.log('\n Tables created:', tables.map(t => Object.values(t)[0]));
    
    if (tables.length > 0) {
      console.log('Schema created successfully! Now running additional files...');
      
      // Only run other files if schema was successful
      await runSQLFile('functions.sql');
      await runSQLFile('procedures.sql'); 
      await runSQLFile('triggers.sql');

      // Always seed after schema and routines
      console.log('\n Seeding sample data (sql/dataSql.js)...');
      const seederPath = path.join(process.cwd(), 'sql', 'dataSql.js');
      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [seederPath], {
          stdio: 'inherit',
        });
        child.on('exit', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Seeder exited with code ${code}`));
        });
        child.on('error', reject);
      });
      console.log(' Seeding completed.');
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