import axios from 'axios';
import { Book, User, Review } from '../types';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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

type BooksQuery = {
  q?: string;
  genre?: string;
  status?: string; // 'active' | 'retired'
  publisherId?: number;
  page?: number;
  pageSize?: number;
  sortBy?: 'title' | 'genre' | 'publishedYear' | 'publisher' | 'copiesAvailable' | 'copiesTotal' | 'status' | 'rating' | 'ratingsCount';
  sortDir?: 'asc' | 'desc';
};

const getBooksPaged = async (params: BooksQuery): Promise<{ items: Book[]; total: number }> => {
  const res = await API.get('/books', { params });
  const totalHeader = (res.headers && (res.headers['x-total-count'] || res.headers['X-Total-Count'])) as string | undefined;
  const total = totalHeader ? Number(totalHeader) : (Array.isArray(res.data) ? res.data.length : 0);
  return { items: res.data, total };
};

// Books for Staff Dashboard: flattens authors array into a single author string
const getBooksForDashboardPaged = async (params: BooksQuery): Promise<{ items: any[]; total: number }> => {
  const res = await API.get('/books', { params });
  const totalHeader = (res.headers && (res.headers['x-total-count'] || res.headers['X-Total-Count'])) as string | undefined;
  const total = totalHeader ? Number(totalHeader) : (Array.isArray(res.data) ? res.data.length : 0);
  const items = (res.data || []).map((r: any) => ({
    ...r,
    author: r.authors?.length ? r.authors.join(', ') : '',
  }));
  return { items, total };
};

const getBookById = async (bookId: number): Promise<Book> => {
  const res = await API.get(`/books/${bookId}`);
  return res.data;
};

const borrowBook = async (bookId: number): Promise<Book> => {
  const res = await API.post(`/books/${bookId}/borrow`);
  return res.data;
};

const createBook = async (bookData: {
  staffId: number;
  title: string;
  genre: string;
  publisherId?: number;
  publisherName?: string;
  publisherAddress?: string;
  copiesTotal: number;
  publishedYear?: number;
  coverImageUrl?: string;
  authorIds?: number[];
  authorNames?: string[];
  authorBios?: string[];
}): Promise<any> => {
  const res = await API.post('/admin/books', bookData);
  return res.data;
};

// ---------- Admin Books API (staff) ----------
const retireBook = async (bookId: number, staffId: number): Promise<any> => {
  const res = await API.put(`/admin/books/${bookId}/retire`, { staffId });
  return res.data;
};

const unretireBook = async (bookId: number, staffId: number): Promise<any> => {
  const res = await API.put(`/admin/books/${bookId}/unretire`, { staffId });
  return res.data;
};

const updateBookInventory = async (bookId: number, staffId: number, newTotal: number): Promise<any> => {
  const res = await API.put(`/admin/books/${bookId}/inventory`, { staffId, newTotal });
  return res.data;
};

// ---------- Reports API (staff) ----------
const reportsMostBorrowed = async (start: string, end: string): Promise<any> => {
  const res = await API.get('/reports/most-borrowed', { params: { start, end } });
  return res.data;
};

const reportsTopReaders = async (): Promise<any> => {
  const res = await API.get('/reports/top-readers');
  return res.data;
};

const reportsLowAvailability = async (): Promise<any> => {
  const res = await API.get('/reports/low-availability');
  return res.data;
};

// ---------- Analytics API ----------
const analyticsAvgSessionTime = async (limit = 100): Promise<any> => {
  const res = await API.get('/analytics/avg-session-time-per-user', { params: { limit } });
  return res.data;
};

const analyticsMostHighlightedBooks = async (limit = 10): Promise<any> => {
  const res = await API.get('/analytics/most-highlighted-books', { params: { limit } });
  return res.data;
};

const analyticsTopBooksByReadingTime = async (limit = 10): Promise<any> => {
  const res = await API.get('/analytics/top-books-by-reading-time', { params: { limit } });
  return res.data;
};

// ---------- Library API ----------
const listUserBorrowings = async (userId: string | number): Promise<any[]> => {
  const res = await API.get(`/library/user/${userId}/borrowings`);
  return res.data;
};

const borrowLibrary = async (payload: { userId: number; bookId: number; days: number }): Promise<any> => {
  const res = await API.post('/library/borrow', payload);
  return res.data;
};

const returnLibrary = async (checkoutId: number): Promise<any> => {
  const res = await API.post('/library/return', { checkoutId });
  return res.data;
};

// ---------- eBooks API ----------
type EbookListQuery = { page?: number; pageSize?: number };

const listBooksForEbooksPaged = async (
  params: EbookListQuery = { page: 1, pageSize: 12 }
): Promise<{ items: Array<{ bookId: number; title: string; author: string; genre: string; publishedYear: number | null }>; total: number }> => {
  const res = await API.get('/books', {
    params: {
      status: 'active',
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 12,
      sortBy: 'title',
      sortDir: 'asc',
    },
  });
  const totalHeader = (res.headers && (res.headers['x-total-count'] || res.headers['X-Total-Count'])) as string | undefined;
  const total = totalHeader ? Number(totalHeader) : (Array.isArray(res.data) ? res.data.length : 0);
  const items = (res.data || []).map((r: any) => ({
    bookId: Number(r.id),
    title: r.title,
    author: r.authors?.length ? r.authors.join(', ') : '',
    genre: r.genre,
    publishedYear: r.publishedYear ?? null,
  }));
  return { items, total };
};

const createEbookSession = async (payload: any): Promise<any> => {
  const res = await API.post('/ebooks/sessions', payload);
  return res.data;
};

const listEbookSessions = async (userId: number): Promise<any[]> => {
  const res = await API.get(`/ebooks/sessions/${userId}`);
  return res.data;
};

const listMongoEbooks = async (): Promise<any[]> => {
  const res = await API.get('/ebooks/mongo-ebooks');
  return res.data;
};


// ---------- Publishers API (staff) ----------
const listPublishers = async (q?: string): Promise<any[]> => {
  const res = await API.get('/publishers', { params: q ? { q } : {} });
  return res.data;
};

const getPublisher = async (id: number): Promise<any> => {
  const res = await API.get(`/publishers/${id}`);
  return res.data;
};

const createPublisher = async (data: { name: string; address?: string }): Promise<any> => {
  const res = await API.post('/publishers', data);
  return res.data;
};

const updatePublisher = async (
  id: number,
  data: { name?: string; address?: string }
): Promise<any> => {
  const res = await API.put(`/publishers/${id}`, data);
  return res.data;
};

const deletePublisher = async (id: number): Promise<any> => {
  const res = await API.delete(`/publishers/${id}`);
  return res.data;
};

// ---------- Authors API (staff) ----------
const listAuthors = async (q?: string): Promise<any[]> => {
  const res = await API.get('/authors', { params: q ? { q } : {} });
  return res.data;
};

const getAuthor = async (id: number): Promise<any> => {
  const res = await API.get(`/authors/${id}`);
  return res.data;
};

const createAuthor = async (data: { name: string; bio?: string }): Promise<any> => {
  const res = await API.post('/authors', data);
  return res.data;
};

const updateAuthor = async (
  id: number,
  data: { name?: string; bio?: string }
): Promise<any> => {
  const res = await API.put(`/authors/${id}`, data);
  return res.data;
};

const deleteAuthor = async (id: number): Promise<any> => {
  const res = await API.delete(`/authors/${id}`);
  return res.data;
};

const attachAuthorsToBook = async (bookId: number, authorIds: number[]): Promise<any> => {
  const res = await API.post(`/admin/books/${bookId}/authors`, { authorIds });
  return res.data;
};

// ---------- Reviews API ----------
const getBookReviews = async (bookId: number): Promise<Review[]> => {
  const res = await API.get(`/reviews/book/${bookId}`);
  return res.data;
};

const getUserReviews = async (userId: string | number): Promise<any[]> => {
  const res = await API.get(`/reviews/user/${userId}`);
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

// ---------- Export API ----------
export default {
  login,
  logout,
  getCurrentUser,
  getBooks,
  getBooksPaged,
  getBooksForDashboardPaged,
  getBookById,
  borrowBook,
  createBook,
  retireBook,
  unretireBook,
  updateBookInventory,
  // publishers
  listPublishers,
  getPublisher,
  createPublisher,
  updatePublisher,
  deletePublisher,
  // authors
  listAuthors,
  getAuthor,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  attachAuthorsToBook,
  // reports
  reportsMostBorrowed,
  reportsTopReaders,
  reportsLowAvailability,
  // analytics
  analyticsAvgSessionTime,
  analyticsMostHighlightedBooks,
  analyticsTopBooksByReadingTime,
  // misc
  listMongoEbooks,
  // ebooks
  listBooksForEbooksPaged,
  createEbookSession,
  listEbookSessions,
  // library
  listUserBorrowings,
  borrowLibrary,
  returnLibrary,
  getBookReviews,
  getUserReviews,
  submitBookReview,
};
