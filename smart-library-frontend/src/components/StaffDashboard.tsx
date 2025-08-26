import React, { useState, useEffect } from 'react';
import { BookOpen, BarChart3, Plus } from 'lucide-react';
import { Book, User } from '../types';
import BookForm from './BookForm';

// Backend API base
const API_BASE = "http://localhost:4001";

// --- API helper functions ---
async function fetchBooks() {
  const res = await fetch(`${API_BASE}/books`); // GET /books
  if (!res.ok) throw new Error('Failed to fetch books');
  const rawData = await res.json();
  return rawData.map((r: any) => ({
    ...r,
    author: r.authors?.length ? r.authors.join(', ') : '',
  }));
}

async function updateBookInventory(bookId: number, staffId: number, newTotal: number) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/admin/books/${bookId}/inventory`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ staffId, newTotal }), // bookId comes from URL, so not in body
  });

  if (!res.ok) throw new Error('Failed to update inventory');
  return res.json();
}


async function retireBook(bookId: number, staffId: number) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/admin/books/${bookId}/retire`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ staffId }), // bookId is in URL, not body
  });

  if (!res.ok) throw new Error('Failed to retire book');
  return res.json();
}


// --- NEW: Report fetchers ---
async function fetchMostBorrowed(start: string, end: string) {
  // GET /reports/most-borrowed?start=...&end=...
  const res = await fetch(`${API_BASE}/reports/most-borrowed?start=${start}&end=${end}`);
  if (!res.ok) throw new Error('Failed to fetch most borrowed report');
  return res.json();
}

async function fetchTopReaders() {
  // GET /reports/top-readers
  const res = await fetch(`${API_BASE}/reports/top-readers`);
  if (!res.ok) throw new Error('Failed to fetch top readers report');
  return res.json();
}

async function fetchLowAvailability() {
  // GET /reports/low-availability
  const res = await fetch(`${API_BASE}/reports/low-availability`);
  if (!res.ok) throw new Error('Failed to fetch low availability report');
  return res.json();
}

/* ===========================
   NEW: Analytics fetchers
   ===========================
   These endpoints analyze MongoDB reading session logs:
   Each session contains: userId, bookId, startTime, endTime, device, pagesRead, highlights[]
*/
async function fetchAverageSessionTime() {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No auth token found, please log in again.");
  }

  const url = `${API_BASE}/analytics/avg-session-time-per-user?limit=100`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to fetch average session time per user (status ${res.status}): ${text}`
    );
  }

  return res.json();
}

async function fetchMostHighlightedBooks() {
  const token = localStorage.getItem("token"); 
  if (!token) {
    throw new Error("No auth token found, please log in again.");
  }

  const url = `${API_BASE}/analytics/most-highlighted-books?limit=10`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to fetch most highlighted books (status ${res.status}): ${text}`
    );
  }

  return res.json();
}


async function fetchTopBooksByReadingTime() {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No auth token found, please log in again.");
  }

  const url = `${API_BASE}/analytics/top-books-by-reading-time?limit=10`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to fetch top books by total reading time (status ${res.status}): ${text}`
    );
  }

  return res.json();
}


// --- Component ---
interface StaffDashboardProps {
  currentUser: User;
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'reports' | 'analytics'>('inventory');
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showBookForm, setShowBookForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [sortBy, setSortBy] = useState('title');

  // Reports state
  const [mostBorrowed, setMostBorrowed] = useState<any[]>([]);
  const [topReaders, setTopReaders] = useState<any[]>([]);
  const [lowAvailability, setLowAvailability] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // NEW: Analytics state
  const [averageSessionTime, setAverageSessionTime] = useState<any[]>([]);
  const [mostHighlighted, setMostHighlighted] = useState<any[]>([]);
  const [topReadingTime, setTopReadingTime] = useState<any[]>([]);

  // Fetch books on load
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const data = await fetchBooks();
        setBooks(data);
      } catch (err) {
        // Error loading books - could be handled by setting an error state if needed
      }
    };
    loadBooks();
  }, []);

  const genres = [...new Set(books.map(book => book.genre))].sort();
  const filteredBooks = books
    .filter(book => {
      const matchesSearch =
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGenre = !filterGenre || book.genre === filterGenre;
      return matchesSearch && matchesGenre;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title': return a.title.localeCompare(b.title);
        case 'author': return a.author.localeCompare(b.author);
        case 'availability': return (b.copiesAvailable || 0) - (a.copiesAvailable || 0);
        default: return 0;
      }
    });

  // --- Handlers ---
  const handleSaveBook = async (savedBook: any) => {
    try {
      // The BookForm has already successfully created the book
      // Just refresh the books list to show the new book
      const updatedBooks = await fetchBooks();
      setBooks(updatedBooks);
      setShowBookForm(false);
      setSelectedBook(null);
    } catch (err) {
      alert('Failed to refresh book list');
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    if (!window.confirm('Are you sure you want to retire this book?')) return;
    try {
      await retireBook(Number(bookId), Number(currentUser.id));
      const updatedBooks = await fetchBooks();
      setBooks(updatedBooks);
    } catch (err) {
      alert('Failed to retire book');
    }
  };

  const handleInventoryUpdate = async (bookId: number, newTotal: number) => {
    try {
      await updateBookInventory(Number(bookId), Number(currentUser.id), newTotal);
      const updatedBooks = await fetchBooks();
      setBooks(updatedBooks);
    } catch (err) {
      alert('Failed to update inventory');
    }
  };

  const handleCloseForm = () => {
    setShowBookForm(false);
    setSelectedBook(null);
  };

  // Report handlers
  const handleGenerateMostBorrowed = async () => {
    try {
      const data = await fetchMostBorrowed(dateRange.start, dateRange.end);
      setMostBorrowed(data);
    } catch (err) {
      // Error handling could be implemented by showing error to user
    }
  };

  const handleGenerateTopReaders = async () => {
    try {
      const data = await fetchTopReaders();
      setTopReaders(data);
    } catch (err) {
      // Error handling could be implemented by showing error to user
    }
  };

  const handleGenerateLowAvailability = async () => {
    try {
      const data = await fetchLowAvailability();
      setLowAvailability(data);
    } catch (err) {
      // Error handling could be implemented by showing error to user
    }
  };

  // NEW: Analytics handlers
  const handleGenerateAverageSessionTime = async () => {
    try {
      const data = await fetchAverageSessionTime();
      setAverageSessionTime(data.results); // 👈 use .results
    } catch (err) {
      // Error handling could be implemented by showing error to user
    }
  };

  const handleGenerateMostHighlighted = async () => {
    try {
      const data = await fetchMostHighlightedBooks();
      // backend returns { start, end, count, results: [...] }
      setMostHighlighted(data.results);
    } catch (err) {
      // Error handling could be implemented by showing error to user
    }
  };

  const handleGenerateTopReadingTime = async () => {
    try {
      const data = await fetchTopBooksByReadingTime();
      setTopReadingTime(data.results);
    } catch (err) {
      // Error handling could be implemented by showing error to user
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Dashboard</h1>
        <p className="text-gray-600">Welcome back, {currentUser.name}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-8">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 ${
                activeTab === 'inventory'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Book Inventory</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 ${
                activeTab === 'reports'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Reports</span>
            </button>

            {/* NEW: Analytics tab button */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 ${
                activeTab === 'analytics'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </button>
          </nav>
        </div>

        {/* --- Inventory Tab --- */}
        {activeTab === 'inventory' && (
          <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Book Inventory Management</h2>
              <button
                onClick={() => {
                  setSelectedBook(null);
                  setShowBookForm(true);
                }}
                className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Book</span>
              </button>
            </div>

            {/* Search / Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                placeholder="Search by title or author..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <select
                value={filterGenre}
                onChange={e => setFilterGenre(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">All Genres</option>
                {genres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="title">Sort by Title</option>
                <option value="author">Sort by Author</option>
                <option value="availability">Sort by Availability</option>
              </select>
            </div>

            {/* Books Table */}
            <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Genre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBooks.map(book => (
                    <tr key={book.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{book.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{book.author}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{book.genre}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {book.copiesAvailable}/{book.totalCopies || book.copiesAvailable}
                        <button
                          onClick={() => {
                            const newTotal = parseInt(
                              prompt("Enter new total copies", String(book.totalCopies || book.copiesAvailable)) || "0"
                            );
                            if (newTotal > 0) handleInventoryUpdate(Number(book.id), newTotal);
                          }}
                          className="ml-2 text-blue-600"
                        >
                          Update
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteBook(Number(book.id))}
                          className="text-red-600"
                        >
                          Retire
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- Reports Tab --- */}
        {activeTab === 'reports' && (
          <div className="p-8 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reports</h2>

            {/* Most Borrowed */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Most Borrowed Books</h3>
              <div className="flex space-x-2 mb-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                  className="border rounded px-2 py-1"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                  className="border rounded px-2 py-1"
                />
                <button
                  onClick={handleGenerateMostBorrowed}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Generate
                </button>
              </div>
              <ul className="list-disc pl-5">
                {mostBorrowed.map((b, i) => (
                  <li key={i}>{b.title} — {b.count} checkouts</li>
                ))}
              </ul>
            </div>

            {/* Top Readers */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Top Active Readers</h3>
              <button
                onClick={handleGenerateTopReaders}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2"
              >
                Generate
              </button>
              <ul className="list-decimal pl-5">
                {topReaders.map((r, i) => (
                  <li key={i}>{r.name} — {r.checkouts} checkouts</li>
                ))}
              </ul>
            </div>

            {/* Low Availability */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Books with Low Availability</h3>
              <button
                onClick={handleGenerateLowAvailability}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2"
              >
                Generate
              </button>
              <ul className="list-disc pl-5">
                {lowAvailability.map((b, i) => (
                  <li key={i}>{b.title} — {b.copiesAvailable} copies left</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* --- NEW: Analytics Tab --- */}
        {activeTab === 'analytics' && (
          <div className="p-8 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Analytics</h2>

            {/* Average Session Time per User */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">
                Average Session Time per User
              </h3>
              <button
                onClick={handleGenerateAverageSessionTime}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2"
              >
                Generate
              </button>
              <ul className="list-decimal pl-5">
                {averageSessionTime.map((u, i) => (
                  <li key={i}>
                    User {u.userId} — {u.avgSessionMinutes} min/session ({u.sessions} sessions)
                  </li>
                ))}
              </ul>
            </div>

            {/* Most Highlighted Books */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Most Highlighted Books</h3>
              <button
                onClick={handleGenerateMostHighlighted}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2"
              >
                Generate
              </button>
              <ul className="list-decimal pl-5">
                {mostHighlighted.map((b, i) => (
                  <li key={i}>
                    Book {b.bookId} — {b.totalHighlights} highlights
                  </li>
                ))}
              </ul>
            </div>


            {/* Top 10 Books by Total Reading Time */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Top 10 Books by Total Reading Time</h3>
              <button
                onClick={handleGenerateTopReadingTime}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2"
              >
                Generate
              </button>
              <ul className="list-decimal pl-5">
                {topReadingTime.map((b, i) => (
                  <li key={i}>
                    Book {b.bookId} — {b.totalReadingHours} hours read ({b.sessions} sessions)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <BookForm
        book={selectedBook}
        isOpen={showBookForm}
        onClose={handleCloseForm}
        onSave={handleSaveBook}
      />
    </div>
  );
};

export default StaffDashboard;
