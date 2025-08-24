import React, { useState, useEffect } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { Book, User } from '../types';
import BookForm from './BookForm';

// Backend API base
const API_BASE = "http://localhost:4000";

// --- API helper functions ---

async function fetchBooks() {
  const res = await fetch(`${API_BASE}/books`); // GET /books
  if (!res.ok) throw new Error('Failed to fetch books');
  const rawData = await res.json();
  // Map authors array to single string for each book
  return rawData.map((r: any) => ({
    ...r,
    author: r.authors?.length ? r.authors.join(', ') : '',
  }));
}

async function addBook(bookData: any) {
  const res = await fetch(`${API_BASE}/admin/books`, {  // endpoint must include /books
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}` // include token
    },
    body: JSON.stringify(bookData)
  });
  if (!res.ok) throw new Error('Failed to add book');
  return res.json();
}


async function updateBookInventory(bookId: number, staffId: number, newTotal: number) {
  const res = await fetch(`${API_BASE}/admin`, { // PUT /admin
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookId, staffId, newTotal, action: 'updateInventory' })
  });
  if (!res.ok) throw new Error('Failed to update inventory');
  return res.json();
}

async function retireBook(bookId: number, staffId: number) {
  const res = await fetch(`${API_BASE}/admin/books/${bookId}/retire`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}` 
    },
    body: JSON.stringify({ staffId })
  });
  if (!res.ok) throw new Error('Failed to retire book');
  return res.json();
}

// --- Component ---
interface StaffDashboardProps {
  currentUser: User;
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'overview'>('inventory');
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showBookForm, setShowBookForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [sortBy, setSortBy] = useState('title');

  // Fetch books on load
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const data = await fetchBooks();
        setBooks(data);
      } catch (err) {
        console.error(err);
      }
    };
    loadBooks();
  }, []);

  const genres = [...new Set(books.map(book => book.genre))].sort();

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = !filterGenre || book.genre === filterGenre;
    return matchesSearch && matchesGenre;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'title': return a.title.localeCompare(b.title);
      case 'author': return a.author.localeCompare(b.author);
      case 'availability': return (b.copiesAvailable || 0) - (a.copiesAvailable || 0);
      default: return 0;
    }
  });

  // --- Handlers ---
  const handleSaveBook = async (bookData: Omit<Book, 'id'>) => {
    try {
      await addBook({ staffId: Number(currentUser.id), ...bookData });
      const updatedBooks = await fetchBooks();
      setBooks(updatedBooks);
      setShowBookForm(false);
      setSelectedBook(null);
    } catch (err) {
      console.error('Error saving book:', err);
      alert('Failed to save book');
    }
  };

  const handleEditBook = (book: Book) => {
    setSelectedBook(book);
    setShowBookForm(true);
  };

  const handleDeleteBook = async (bookId: number) => {
    if (!window.confirm('Are you sure you want to retire this book?')) return;
    try {
      await retireBook(Number(bookId), Number(currentUser.id));
      const updatedBooks = await fetchBooks();
      setBooks(updatedBooks);
    } catch (err) {
      console.error(err);
      alert('Failed to retire book');
    }
  };

  const handleInventoryUpdate = async (bookId: number, newTotal: number) => {
    try {
      await updateBookInventory(Number(bookId), Number(currentUser.id), newTotal);
      const updatedBooks = await fetchBooks();
      setBooks(updatedBooks);
    } catch (err) {
      console.error(err);
      alert('Failed to update inventory');
    }
  };

  const handleCloseForm = () => {
    setShowBookForm(false);
    setSelectedBook(null);
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
                activeTab === 'inventory' ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Book Inventory</span>
            </button>
          </nav>
        </div>

        {activeTab === 'inventory' && (
          <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Book Inventory Management</h2>
              <button
                onClick={() => { setSelectedBook(null); setShowBookForm(true); }}
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
                            const newTotal = parseInt(prompt("Enter new total copies", String(book.totalCopies || book.copiesAvailable)) || "0");
                            if (newTotal > 0) handleInventoryUpdate(Number(book.id), newTotal);
                          }}
                          className="ml-2 text-blue-600"
                        >
                          Update
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => handleDeleteBook(Number(book.id))} className="text-red-600">Retire</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <BookForm
        staffId={Number(currentUser.id)}
        book={selectedBook}
        isOpen={showBookForm}
        onClose={handleCloseForm}
        onSave={handleSaveBook}
      />
    </div>
  );
};

export default StaffDashboard;
