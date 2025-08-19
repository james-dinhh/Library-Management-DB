export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  isbn: string;
  description: string;
  coverImage: string;
  totalCopies: number;
  copiesAvailable: number;
  rating: number;
  reviewCount: number;
  publishedYear: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'staff';
  membershipDate: string;
  avatar: string;
}

export interface BorrowRecord {
  id: string;
  userId: string;
  bookId: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';
}

export interface Review {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Analytics {
  totalBooks: number;
  totalUsers: number;
  activeBorrowings: number;
  overdueBooks: number;
  popularGenres: { name: string; count: number }[];
  monthlyBorrowings: { month: string; count: number }[];
  topBooks: { bookId: string; title: string; borrowCount: number }[];
}