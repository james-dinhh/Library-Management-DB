import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { User, Publisher, Author, Book, BookAuthor, Checkout, Review, StaffLog } from '../src/db/models.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

// .json reader
const filePath = path.resolve('./sample_library.json');
const rawData = fs.readFileSync(filePath);
const data = JSON.parse(rawData);

async function seedFromJson() {
  await mongoose.connect(MONGO_URI);
  // Clear existing data for testing 
  await Promise.all([
    User.deleteMany({}), Publisher.deleteMany({}), Author.deleteMany({}), Book.deleteMany({}),
    BookAuthor.deleteMany({}), Checkout.deleteMany({}), Review.deleteMany({}), StaffLog.deleteMany({})
  ]);

  // Insert publishers
  const publisherMap = {};
  for (const pub of data.publishers) {
    const doc = await Publisher.create({ name: pub.name, address: pub.address });
    publisherMap[pub.publisher_id] = doc._id;
  }

  // Insert authors
  const authorMap = {};
  for (const auth of data.authors) {
    const doc = await Author.create({ name: auth.name, bio: auth.bio });
    authorMap[auth.author_id] = doc._id;
  }

  // Insert users
  const userMap = {};
  for (const usr of data.users) {
    const doc = await User.create({
      name: usr.name,
      email: usr.email,
      role: usr.role,
      password: usr.password,
      registration_date: usr.registration_date
    });
    userMap[usr.user_id] = doc._id;
  }

  // Insert books
  const bookMap = {};
  for (const bk of data.books) {
    const doc = await Book.create({
      title: bk.title,
      genre: bk.genre,
      published_year: bk.published_year,
      publisher_id: publisherMap[bk.publisher_id],
      cover_image_url: bk.cover_image_url,
      copies_total: bk.copies_total,
      copies_available: bk.copies_available,
      status: bk.status,
      avg_rating: bk.avg_rating,
      ratings_count: bk.ratings_count
    });
    bookMap[bk.book_id] = doc._id;
  }

  // Insert book_authors
  for (const ba of data.book_authors) {
    await BookAuthor.create({
      book_id: bookMap[ba.book_id],
      author_id: authorMap[ba.author_id]
    });
  }

  // Insert checkouts
  for (const co of data.checkouts) {
    await Checkout.create({
      user_id: userMap[co.user_id],
      book_id: bookMap[co.book_id],
      borrow_date: co.borrow_date,
      due_date: co.due_date,
      return_date: co.return_date,
      is_late: co.is_late
    });
  }

  // Insert reviews
  for (const rv of data.reviews) {
    await Review.create({
      user_id: userMap[rv.user_id],
      book_id: bookMap[rv.book_id],
      rating: rv.rating,
      comment: rv.comment,
      review_date: rv.review_date
    });
  }

  // Insert staff_logs
  for (const sl of data.staff_logs) {
    await StaffLog.create({
      staff_id: userMap[sl.staff_id],
      action_type: sl.action_type,
      book_id: bookMap[sl.book_id],
      timestamp: sl.timestamp
    });
  }

  await mongoose.disconnect();
  console.log('Sample data from JSON inserted.');
}

seedFromJson().catch(err => {
  console.error('Error seeding database:', err);
  process.exit(1);
});
