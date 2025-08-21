// src/services/api.ts
import axios from 'axios';
import { Book, User, Review } from '../types';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------- User API ----------
const login = async (email: string, password: string): Promise<User> => {
  const res = await API.post('/auth/login', { email, password });
  return res.data;
};

const logout = async (): Promise<void> => {
  await API.post('/auth/logout');
};

const getCurrentUser = async (): Promise<User> => {
  const res = await API.get('/auth/me');
  return res.data;
};

// ---------- Books API ----------
const getBooks = async (): Promise<Book[]> => {
  const res = await API.get('/books');
  return res.data;
};

const getBookById = async (bookId: number): Promise<Book> => {
  const res = await API.get(`/books/${bookId}`);
  return res.data;
};

const borrowBook = async (bookId: number): Promise<Book> => {
  const res = await API.post(`/books/${bookId}/borrow`);
  return res.data;
};

// ---------- Reviews API ----------
const getBookReviews = async (bookId: number): Promise<Review[]> => {
  const res = await API.get(`/reviews/book/${bookId}`);
  return res.data;
};

const submitBookReview = async (
  bookId: number,
  userId: number,
  rating: number,
  comment: string
): Promise<Review> => {
  const res = await API.post(`/reviews`, { bookId, userId, rating, comment });
  return res.data;
};

// ---------- Export ----------
export default {
  login,
  logout,
  getCurrentUser,
  getBooks,
  getBookById,
  borrowBook,
  getBookReviews,
  submitBookReview,
};
