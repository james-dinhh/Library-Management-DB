import { Book, User, BorrowRecord, Review, Analytics } from '../types';

export const mockBooks: Book[] = [
  {
    id: '1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    genre: 'Classic Literature',
    isbn: '978-0-7432-7356-5',
    description: 'A classic American novel set in the Jazz Age, exploring themes of wealth, love, idealism, and moral decay.',
    coverImage: 'https://images.pexels.com/photos/1130980/pexels-photo-1130980.jpeg',
    totalCopies: 5,
    availableCopies: 3,
    rating: 4.2,
    reviewCount: 128,
    publishedYear: 1925
  },
  {
    id: '2',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    genre: 'Fiction',
    isbn: '978-0-06-112008-4',
    description: 'A profound tale of racial injustice and childhood innocence in the American South.',
    coverImage: 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg',
    totalCopies: 4,
    availableCopies: 2,
    rating: 4.5,
    reviewCount: 95,
    publishedYear: 1960
  },
  {
    id: '3',
    title: '1984',
    author: 'George Orwell',
    genre: 'Dystopian Fiction',
    isbn: '978-0-452-28423-4',
    description: 'A dystopian social science fiction novel exploring themes of totalitarianism and surveillance.',
    coverImage: 'https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg',
    totalCopies: 6,
    availableCopies: 0,
    rating: 4.4,
    reviewCount: 203,
    publishedYear: 1949
  },
  {
    id: '4',
    title: 'The Catcher in the Rye',
    author: 'J.D. Salinger',
    genre: 'Coming-of-age',
    isbn: '978-0-316-76948-0',
    description: 'A coming-of-age story following Holden Caulfield in New York City.',
    coverImage: 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg',
    totalCopies: 3,
    availableCopies: 1,
    rating: 3.8,
    reviewCount: 87,
    publishedYear: 1951
  },
  {
    id: '5',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    genre: 'Romance',
    isbn: '978-0-14-143951-8',
    description: 'A romantic novel exploring themes of love, marriage, and social class in Regency England.',
    coverImage: 'https://images.pexels.com/photos/1130980/pexels-photo-1130980.jpeg',
    totalCopies: 4,
    availableCopies: 4,
    rating: 4.3,
    reviewCount: 156,
    publishedYear: 1813
  },
  {
    id: '6',
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    genre: 'Fantasy',
    isbn: '978-0-547-92822-7',
    description: 'A fantasy adventure following Bilbo Baggins on an unexpected journey.',
    coverImage: 'https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg',
    totalCopies: 8,
    availableCopies: 5,
    rating: 4.6,
    reviewCount: 234,
    publishedYear: 1937
  }
];

export const mockUsers: User[] = [
  {
    id: 'user1',
    name: 'John Doe',
    email: 'john.doe@email.com',
    role: 'user',
    membershipDate: '2023-01-15',
    avatar: 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg'
  },
  {
    id: 'staff1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@library.com',
    role: 'staff',
    membershipDate: '2020-03-10',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg'
  }
];

export const mockBorrowRecords: BorrowRecord[] = [
  {
    id: 'br1',
    userId: 'user1',
    bookId: '1',
    borrowDate: '2024-12-01',
    dueDate: '2024-12-15',
    status: 'borrowed'
  },
  {
    id: 'br2',
    userId: 'user1',
    bookId: '2',
    borrowDate: '2024-11-15',
    dueDate: '2024-11-29',
    returnDate: '2024-11-28',
    status: 'returned'
  }
];

export const mockReviews: Review[] = [
  {
    id: 'r1',
    bookId: '1',
    userId: 'user1',
    userName: 'John Doe',
    rating: 4,
    comment: 'A timeless classic that captures the essence of the American Dream. The writing is beautiful and the characters are unforgettable.',
    date: '2024-11-28'
  },
  {
    id: 'r2',
    bookId: '2',
    userId: 'user1',
    userName: 'John Doe',
    rating: 5,
    comment: 'Powerful and moving. A must-read that addresses important social issues with grace and wisdom.',
    date: '2024-11-20'
  }
];

export const mockAnalytics: Analytics = {
  totalBooks: 6,
  totalUsers: 156,
  activeBorrowings: 23,
  overdueBooks: 5,
  popularGenres: [
    { name: 'Fiction', count: 45 },
    { name: 'Fantasy', count: 32 },
    { name: 'Romance', count: 28 },
    { name: 'Classic Literature', count: 25 },
    { name: 'Dystopian Fiction', count: 18 }
  ],
  monthlyBorrowings: [
    { month: 'Jan', count: 34 },
    { month: 'Feb', count: 45 },
    { month: 'Mar', count: 52 },
    { month: 'Apr', count: 38 },
    { month: 'May', count: 47 },
    { month: 'Jun', count: 55 }
  ],
  topBooks: [
    { bookId: '6', title: 'The Hobbit', borrowCount: 28 },
    { bookId: '3', title: '1984', borrowCount: 25 },
    { bookId: '1', title: 'The Great Gatsby', borrowCount: 23 }
  ]
};