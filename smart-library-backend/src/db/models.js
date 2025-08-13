
import mongoose from 'mongoose';
const { Schema } = mongoose;


// Enums
const ROLE = ['reader', 'staff'];
const ACTION_TYPE = ['add_book', 'update_book', 'retire_book'];
const BOOK_STATUS = ['active', 'retired'];


// Users
const userSchema = new Schema({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, maxlength: 100 },
  role: { type: String, enum: ROLE, required: true },
  password: { type: String, required: true, maxlength: 100 },
  registration_date: { type: Date, default: Date.now }
});

// Publishers
const publisherSchema = new Schema({
  name: { type: String, required: true, unique: true, maxlength: 100 },
  address: { type: String, maxlength: 255 }
});

// Authors
const authorSchema = new Schema({
  name: { type: String, required: true, unique: true, maxlength: 100 },
  bio: { type: String }
});

// Books
const bookSchema = new Schema({
  title: { type: String, required: true, maxlength: 255 },
  genre: { type: String, required: true, maxlength: 50 },
  published_year: { type: Number },
  publisher_id: { type: Schema.Types.ObjectId, ref: 'Publisher', required: true },
  cover_image_url: { type: String, maxlength: 512 },
  copies_total: { type: Number, required: true },
  copies_available: { type: Number, required: true },
  status: { type: String, enum: BOOK_STATUS, default: 'active', required: true },
  avg_rating: { type: Number, min: 0, max: 5 },
  ratings_count: { type: Number, default: 0 }
});

// Book-Author (many-to-many)
const bookAuthorSchema = new Schema({
  book_id: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  author_id: { type: Schema.Types.ObjectId, ref: 'Author', required: true }
});

// Checkouts
const checkoutSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  book_id: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  borrow_date: { type: Date, required: true },
  due_date: { type: Date, required: true },
  return_date: { type: Date },
  is_late: { type: Boolean }
});

// Reviews
const reviewSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  book_id: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  review_date: { type: Date, default: Date.now }
});

// Staff Logs
const staffLogSchema = new Schema({
  staff_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action_type: { type: String, enum: ACTION_TYPE, required: true },
  book_id: { type: Schema.Types.ObjectId, ref: 'Book' },
  timestamp: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
export const Publisher = mongoose.model('Publisher', publisherSchema);
export const Author = mongoose.model('Author', authorSchema);
export const Book = mongoose.model('Book', bookSchema);
export const BookAuthor = mongoose.model('BookAuthor', bookAuthorSchema);
export const Checkout = mongoose.model('Checkout', checkoutSchema);
export const Review = mongoose.model('Review', reviewSchema);
export const StaffLog = mongoose.model('StaffLog', staffLogSchema);
