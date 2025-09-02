// Typescript Declarations for Book
export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  isbn: string;
  description: string;
  coverImageUrl: string;
  totalCopies: number;
  copiesAvailable: number;
  rating: number;
  reviewCount: number;
  publishedYear: number;
  status: 'active' | 'retired';
  reviews?: Review[];
}

// Typescript Declarations for User
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'reader' | 'staff';
  membershipDate: string;
  avatar: string;
}

//Typescript Declaration for BorrowRecord
export interface BorrowRecord {
  id: string;
  checkoutId: number;
  userId: string;
  bookId: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';
  isLate?: number | null; // 1 = late, 0 = on time, null = not returned
}

// Typescript Declaration for Review
export interface Review {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  bookTitle?: string;
}

// Typescript Declaration for Analytics
export interface Analytics {
  totalBooks: number;
  totalUsers: number;
  activeBorrowings: number;
  overdueBooks: number;
  popularGenres: { name: string; count: number }[];
  monthlyBorrowings: { month: string; count: number }[];
  topBooks: { bookId: string; title: string; borrowCount: number }[];
}