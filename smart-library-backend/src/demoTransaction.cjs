const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'localhost',
  port: 3308,
  user: 'root',
  password: 'sinhgiap',
  database: 'smart_library'
};

// Simulate two users borrowing the last copy at the same time
async function borrowConcurrencyDemo(bookId, userId1, userId2) {
  const conn1 = await mysql.createConnection(DB_CONFIG);
  const conn2 = await mysql.createConnection(DB_CONFIG);

  console.log(`\n--- Borrow Concurrency Demo ---`);
  console.log(`Trying to borrow book ${bookId} with users ${userId1} and ${userId2} at the same time...`);

  // Run both borrows in parallel, but catch errors individually
  await Promise.all([
    (async () => {
      try {
        await conn1.query('SET @result = 0');
        await conn1.query('CALL sp_borrow_book(?, ?, ?, @result)', [userId1, bookId, 14]);
        const [[row]] = await conn1.query('SELECT @result as borrow_status');
        console.log(`User ${userId1} borrow status:`, row.borrow_status);
      } catch (err) {
        console.log(`User ${userId1} error:`, err.sqlMessage || err.message);
      }
    })(),
    (async () => {
      try {
        await conn2.query('SET @result = 0');
        await conn2.query('CALL sp_borrow_book(?, ?, ?, @result)', [userId2, bookId, 14]);
        const [[row]] = await conn2.query('SELECT @result as borrow_status');
        console.log(`User ${userId2} borrow status:`, row.borrow_status);
      } catch (err) {
        console.log(`User ${userId2} error:`, err.sqlMessage || err.message);
      }
    })()
  ]);

  await conn1.end();
  await conn2.end();
}

async function runDemo() {
  // Use bookId=1 (ensure it has only 1 available copy before running)
  // Use userId=2 and userId=3 (must exist in your users table)
  await borrowConcurrencyDemo(1, 2, 3);
}

runDemo();