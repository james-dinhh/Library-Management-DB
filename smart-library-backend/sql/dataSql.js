import { mysqlPool } from '../src/db/mysql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the JSON file
const filePath = path.resolve('./sample_library.json');
const rawData = fs.readFileSync(filePath);
const data = JSON.parse(rawData);


async function seedMySQLFromJson() {
  const connection = await mysqlPool.getConnection();

  try {
    console.log('Starting MySQL database seeding...\n');

    // Start transaction
    await connection.beginTransaction();

    // Clear existing data (in reverse order due to foreign keys)
    await connection.execute('DELETE FROM staff_logs');
    await connection.execute('DELETE FROM reviews');
    await connection.execute('DELETE FROM checkouts');
    await connection.execute('DELETE FROM book_authors');
    await connection.execute('DELETE FROM books');
    await connection.execute('DELETE FROM authors');
    await connection.execute('DELETE FROM publishers');
    await connection.execute('DELETE FROM users');

    console.log('Existing data cleared\n');

    // Insert users
    console.log('Inserting users...');
    for (const user of data.users) {
      await connection.execute(
        'INSERT INTO users (user_id, name, email, role, password, registration_date) VALUES (?, ?, ?, ?, ?, ?)',
        [
          user.user_id,
          user.name,
          user.email,
          user.role,
          user.password,
          user.registration_date
        ]
      );
    }
    console.log(`Inserted ${data.users.length} users`);

    // Insert publishers
    console.log('Inserting publishers...');
    for (const publisher of data.publishers) {
      await connection.execute(
        'INSERT INTO publishers (publisher_id, name, address) VALUES (?, ?, ?)',
        [
          publisher.publisher_id,
          publisher.name,
          publisher.address
        ]
      );
    }
    console.log(`Inserted ${data.publishers.length} publishers`);

    // Insert authors
    console.log('Inserting authors...');
    for (const author of data.authors) {
      await connection.execute(
        'INSERT INTO authors (author_id, name, bio) VALUES (?, ?, ?)',
        [
          author.author_id,
          author.name,
          author.bio
        ]
      );
    }
    console.log(`Inserted ${data.authors.length} authors`);

    // Insert books
    console.log('Inserting books...');
    for (const book of data.books) {
      // Ensure copies_available never exceeds copies_total
      let copiesTotal = book.copies_total || 0;
      let copiesAvailable = book.copies_available || 0;
      
      // If copies_available is greater than copies_total, set copies_total to match
      if (copiesAvailable > copiesTotal) {
        copiesTotal = copiesAvailable;
      }
      
      await connection.execute(
        `INSERT INTO books (
          book_id, title, genre, published_year, publisher_id, cover_image_url, copies_total, copies_available, status, avg_rating, ratings_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          book.book_id,
          book.title,
          book.genre,
          book.published_year || null,
          book.publisher_id,
          book.cover_image_url || null,
          copiesTotal,
          copiesAvailable,
          book.status || 'active',
          book.avg_rating || null,
          book.ratings_count || 0
        ]
      );
    }
    console.log(`Inserted ${data.books.length} books`);

    // Insert book_authors
    console.log('Inserting book-author relationships...');
    for (const ba of data.book_authors) {
      await connection.execute(
        'INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)',
        [
          ba.book_id,
          ba.author_id
        ]
      );
    }
    console.log(`Inserted ${data.book_authors.length} book-author relationships`);

    // Insert checkouts
    console.log('Inserting checkouts...');
    for (const checkout of data.checkouts) {
      await connection.execute(
        'INSERT INTO checkouts (checkout_id, user_id, book_id, borrow_date, due_date, return_date) VALUES (?, ?, ?, ?, ?, ?)',
        [
          checkout.checkout_id,
          checkout.user_id,
          checkout.book_id,
          checkout.borrow_date,
          checkout.due_date,
          checkout.return_date
        ]
      );
    }
    console.log(`Inserted ${data.checkouts.length} checkouts`);

    // Insert reviews
    console.log(' Inserting reviews...');
    for (const review of data.reviews) {
      await connection.execute(
        'INSERT INTO reviews (review_id, user_id, book_id, rating, comment, review_date) VALUES (?, ?, ?, ?, ?, ?)',
        [
          review.review_id,
          review.user_id,
          review.book_id,
          review.rating,
          review.comment,
          review.review_date
        ]
      );
    }
    console.log(`Inserted ${data.reviews.length} reviews`);

    // Insert staff_logs
    console.log('Inserting staff logs...');
    for (const log of data.staff_logs) {
      await connection.execute(
        'INSERT INTO staff_logs (log_id, staff_id, action_type, book_id, timestamp) VALUES (?, ?, ?, ?, ?)',
        [
          log.log_id,
          log.staff_id,
          log.action_type,
          log.book_id,
          log.timestamp
        ]
      );
    }
    console.log(` Inserted ${data.staff_logs.length} staff logs`);

    // Commit transaction
    await connection.commit();

    // Verify data
    console.log('\n Verifying data insertion...');
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [bookCount] = await connection.execute('SELECT COUNT(*) as count FROM books');
    const [checkoutCount] = await connection.execute('SELECT COUNT(*) as count FROM checkouts');

    console.log(`Final counts:`);
    console.log(`   Users: ${userCount[0].count}`);
    console.log(`   Books: ${bookCount[0].count}`);
    console.log(`   Checkouts: ${checkoutCount[0].count}`);

    console.log('\nMySQL database seeding completed successfully!');

  } catch (error) {
    await connection.rollback();
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    connection.release();
    await mysqlPool.end();
  }
}

seedMySQLFromJson().catch(err => {
  console.error('Error seeding MySQL database:', err);
  process.exit(1);
});
