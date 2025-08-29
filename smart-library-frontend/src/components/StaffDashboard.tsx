import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, BarChart3, Plus, MoreVertical } from 'lucide-react';
import { Book, User } from '../types';
import BookForm from './BookForm';
import API from '../services/api';
import { ConfirmDialog, PromptDialog } from './ui/dialogs';
import { useToast } from './ui/toast';

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
  const [filterStatus, setFilterStatus] = useState(''); // 'active', 'retired', or '' for all
  const [sortBy, setSortBy] = useState('title');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const toast = useToast();
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Dialog state
  const [confirmState, setConfirmState] = useState<{
    type: 'retire' | 'unretire' | null;
    book: Book | null;
  }>({ type: null, book: null });
  const [promptState, setPromptState] = useState<{
    book: Book | null;
    open: boolean;
  }>({ book: null, open: false });

  // Reports state
  const [mostBorrowed, setMostBorrowed] = useState<any[]>([]);
  const [topReaders, setTopReaders] = useState<any[]>([]);
  const [lowAvailability, setLowAvailability] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // NEW: Analytics state
  const [averageSessionTime, setAverageSessionTime] = useState<any[]>([]);
  const [mostHighlighted, setMostHighlighted] = useState<any[]>([]);
  const [topReadingTime, setTopReadingTime] = useState<any[]>([]);

  // Add state for MongoDB eBooks
  const [mongoBooks, setMongoBooks] = useState<any[]>([]);

  // Add state for user names
  const [userNames, setUserNames] = useState<{[id: number]: string}>({});
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fetch books (server-side pagination/sorting + server filters)
  useEffect(() => {
    const fetchPage = async () => {
      try {
        // Map UI sort to server sort where possible
        const serverSortBy = sortBy === 'availability' ? 'copiesAvailable' : (sortBy === 'title' ? 'title' : undefined);
        const { items, total } = await API.getBooksForDashboardPaged({
          q: searchTerm || undefined,
          genre: filterGenre || undefined,
          status: filterStatus || undefined,
          page,
          pageSize,
          sortBy: serverSortBy as any,
          sortDir: 'asc',
        });
        // If UI asks to sort by author, do client sort on the current page
        const sortedItems = sortBy === 'author'
          ? [...items].sort((a: any, b: any) => (a.author || '').localeCompare(b.author || ''))
          : items;
        setBooks(sortedItems);
        setTotal(total);
      } catch (err) {
        // optional: toast.show('Failed to load books', 'error');
      }
    };
    fetchPage();
  }, [searchTerm, filterGenre, filterStatus, sortBy, page, pageSize]);

  // Fetch MongoDB eBooks on mount
  useEffect(() => {
  API.listMongoEbooks().then(setMongoBooks);
  }, []);

  // Fetch user names when analytics data changes
  useEffect(() => {
    async function loadUserNames() {
      const ids = averageSessionTime.map(u => u.userId);
      const names: {[id: number]: string} = {};
      for (const id of ids) {
        try {
          const user = await API.getUserById(id);
          names[id] = user.name;
        } catch {}
      }
      setUserNames(names);
    }
    if (averageSessionTime.length) loadUserNames();
  }, [averageSessionTime]);

  // Close the action menu on outside click using a ref to the open menu container
  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const genres = [...new Set(books.map(book => book.genre))].sort();
  // Supplement server filtering by allowing author search client-side (since backend q doesn't include author)
  const filteredBooks = books
    .filter(book => {
      const term = searchTerm.toLowerCase();
      const matchesAuthor = !term || (book.author || '').toLowerCase().includes(term);
      const matchesGenre = !filterGenre || book.genre === filterGenre;
      const matchesStatus = !filterStatus || book.status === filterStatus;
      return matchesAuthor && matchesGenre && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title': return a.title.localeCompare(b.title);
        case 'author': return (a.author || '').localeCompare(b.author || '');
        case 'availability': return (b.copiesAvailable || 0) - (a.copiesAvailable || 0);
        default: return 0;
      }
    });

  // --- Handlers ---
  const handleSaveBook = async (_savedBook: any) => {
    try {
      // Refresh current page
      const serverSortBy = sortBy === 'availability' ? 'copiesAvailable' : (sortBy === 'title' ? 'title' : undefined);
      const { items, total } = await API.getBooksForDashboardPaged({
        q: searchTerm || undefined,
        genre: filterGenre || undefined,
        status: filterStatus || undefined,
        page,
        pageSize,
        sortBy: serverSortBy as any,
        sortDir: 'asc',
      });
      setBooks(items);
      setTotal(total);
      setShowBookForm(false);
      setSelectedBook(null);
      toast.show('Book saved', 'success');
    } catch (err) {
      toast.show('Failed to refresh book list', 'error');
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    try {
  await API.retireBook(Number(bookId), Number(currentUser.id));
      const serverSortBy = sortBy === 'availability' ? 'copiesAvailable' : (sortBy === 'title' ? 'title' : undefined);
      const { items, total } = await API.getBooksForDashboardPaged({
        q: searchTerm || undefined,
        genre: filterGenre || undefined,
        status: filterStatus || undefined,
        page,
        pageSize,
        sortBy: serverSortBy as any,
        sortDir: 'asc',
      });
      setBooks(items);
      setTotal(total);
      toast.show('Book retired', 'success');
    } catch (err) {
      toast.show('Failed to retire book', 'error');
    }
  };

  const handleUnretireBook = async (bookId: number) => {
    try {
      console.log('Unretiring book:', bookId, 'Staff ID:', currentUser.id);
  await API.unretireBook(Number(bookId), Number(currentUser.id));
      const serverSortBy = sortBy === 'availability' ? 'copiesAvailable' : (sortBy === 'title' ? 'title' : undefined);
      const { items, total } = await API.getBooksForDashboardPaged({
        q: searchTerm || undefined,
        genre: filterGenre || undefined,
        status: filterStatus || undefined,
        page,
        pageSize,
        sortBy: serverSortBy as any,
        sortDir: 'asc',
      });
      setBooks(items);
      setTotal(total);
      toast.show('Book unretired', 'success');
    } catch (err) {
      console.error('Unretire book error:', err);
      toast.show(`Failed to unretire book`, 'error');
    }
  };

  const handleInventoryUpdate = async (bookId: number, newTotal: number) => {
    try {
  await API.updateBookInventory(Number(bookId), Number(currentUser.id), newTotal);
      const serverSortBy = sortBy === 'availability' ? 'copiesAvailable' : (sortBy === 'title' ? 'title' : undefined);
      const { items, total } = await API.getBooksForDashboardPaged({
        q: searchTerm || undefined,
        genre: filterGenre || undefined,
        status: filterStatus || undefined,
        page,
        pageSize,
        sortBy: serverSortBy as any,
        sortDir: 'asc',
      });
      setBooks(items);
      setTotal(total);
      toast.show('Inventory updated', 'success');
    } catch (err) {
      toast.show('Failed to update inventory', 'error');
    }
  };

  const handleCloseForm = () => {
    setShowBookForm(false);
    setSelectedBook(null);
  };

  // Report handlers
  const handleGenerateMostBorrowed = async () => {
    try {
  const data = await API.reportsMostBorrowed(dateRange.start, dateRange.end);
      setMostBorrowed(data);
    } catch (err) {
      // Error handling could be implemented by showing error to user
    }
  };

  const handleGenerateTopReaders = async () => {
    try {
  const data = await API.reportsTopReaders();
      setTopReaders(data);
    } catch (err) {
      // Error handling could be implemented by showing error to user
    }
  };

  const handleGenerateLowAvailability = async () => {
    try {
  const data = await API.reportsLowAvailability();
      setLowAvailability(data);
    } catch (err) {
      // Error handling could be implemented by showing error to user
    }
  };

  // NEW: Analytics handlers
  const handleGenerateAverageSessionTime = async () => {
    try {
  const data = await API.analyticsAvgSessionTime();
      setAverageSessionTime(data.results); // 👈 use .results
    } catch (err) {
      // Error handling could be implemented by showing error to user
    }
  };

  const handleGenerateMostHighlighted = async () => {
    try {
  const data = await API.analyticsMostHighlightedBooks();
      // backend returns { start, end, count, results: [...] }
      setMostHighlighted(data.results);
    } catch (err) {
      // Error handling could be implemented by showing error to user
    }
  };

  const handleGenerateTopReadingTime = async () => {
    try {
  const data = await API.analyticsTopBooksByReadingTime();
      setTopReadingTime(data.results);
    } catch (err) {
      // Error handling could be implemented by showing error to user
    }
  };

  function getMongoBookTitle(bookId: number) {
    const book = mongoBooks.find(b => b.bookId === bookId);
    return book ? `${book.title} by ${book.author}` : `Book ${bookId}`;
  }

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">All Books</option>
                <option value="active">Active Books</option>
                <option value="retired">Retired Books</option>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBooks.map(book => (
                    <tr key={book.id} className={`hover:bg-gray-50 ${book.status === 'retired' ? 'bg-gray-50 opacity-75' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={book.status === 'retired' ? 'text-gray-500 line-through' : ''}>{book.title}</span>
                          {book.status === 'retired' && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Retired
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${book.status === 'retired' ? 'text-gray-500' : ''}`}>{book.author}</td>
                      <td className={`px-6 py-4 whitespace-nowrap ${book.status === 'retired' ? 'text-gray-500' : ''}`}>{book.genre}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          book.status === 'retired' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {book.status === 'retired' ? 'Retired' : 'Active'}
                        </span>
                      </td>
                      {/* NEW Inventory cell */}
                      <td className={`px-6 py-4 whitespace-nowrap ${book.status === 'retired' ? 'text-gray-500' : ''}`}>
                        {book.copiesAvailable}/{book.totalCopies || book.copiesAvailable}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className="relative inline-block text-left"
                          ref={openMenuId === String(book.id) ? menuRef : null}
                        >
                          <button
                            onClick={() => setOpenMenuId(prev => prev === String(book.id) ? null : String(book.id))}
                            className="p-1 rounded hover:bg-gray-100 text-gray-600"
                            aria-haspopup="menu"
                            aria-expanded={openMenuId === String(book.id)}
                            aria-label="Actions"
                            type="button"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                          {openMenuId === String(book.id) && (
                            <div
                              className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20"
                              role="menu"
                            >
                              {book.status !== 'retired' && (
                                <button
                                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setPromptState({ book, open: true });
                                  }}
                                >
                                  Update Inventory
                                </button>
                              )}
                              {book.status === 'retired' ? (
                                <button
                                  className="block w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-gray-50"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setConfirmState({ type: 'unretire', book });
                                  }}
                                >
                                  Unretire
                                </button>
                              ) : (
                                <button
                                  className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-50"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setConfirmState({ type: 'retire', book });
                                  }}
                                >
                                  Retire
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination footer */}
              <div className="flex items-center justify-between p-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {(() => {
                    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
                    const end = Math.min(total, page * pageSize);
                    return `Showing ${start}-${end} of ${total}`;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Rows per page:</label>
                  <select
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      className="px-2 py-1 border rounded disabled:opacity-50"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Prev
                    </button>
                    <span className="mx-2 text-sm text-gray-700">Page {page} of {Math.max(1, Math.ceil(total / pageSize) || 1)}</span>
                    <button
                      className="px-2 py-1 border rounded disabled:opacity-50"
                      onClick={() => setPage(p => (p * pageSize < total ? p + 1 : p))}
                      disabled={page * pageSize >= total}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
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
                    {userNames[u.userId] || `User ${u.userId}`} — {u.avgSessionMinutes} min/session ({u.sessions} sessions)
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
                    {getMongoBookTitle(b.bookId)} — {b.totalHighlights} highlights
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
                    {getMongoBookTitle(b.bookId)} — {b.totalReadingHours} hours read ({b.sessions} sessions)
                  </li>
                ))}
              </ul>
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

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={!!confirmState.type && !!confirmState.book}
        title={confirmState.type === 'retire' ? 'Retire book' : 'Unretire book'}
        message={
          confirmState.book ? (
            <span>
              Are you sure you want to {confirmState.type === 'retire' ? 'retire' : 'unretire'}
              {' '}<strong>{confirmState.book.title}</strong>?
            </span>
          ) : ''
        }
        confirmText={confirmState.type === 'retire' ? 'Retire' : 'Unretire'}
  tone={confirmState.type === 'retire' ? 'danger' : 'default'}
        onCancel={() => setConfirmState({ type: null, book: null })}
        onConfirm={() => {
          const bookId = Number(confirmState.book?.id);
          setConfirmState({ type: null, book: null });
          if (!bookId) return;
          if (confirmState.type === 'retire') handleDeleteBook(bookId);
          else handleUnretireBook(bookId);
        }}
      />

      {/* Inventory prompt */}
      <PromptDialog
        open={promptState.open && !!promptState.book}
        title="Update Inventory"
        label="Enter new total copies"
        inputType="number"
        min={1}
        initialValue={String(promptState.book?.totalCopies ?? promptState.book?.copiesAvailable ?? 1)}
        validator={(v) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 1) return 'Please enter a number greater than 0';
          return null;
        }}
        onCancel={() => setPromptState({ open: false, book: null })}
        onSubmit={(v) => {
          const n = Number(v);
          const id = Number(promptState.book?.id);
          setPromptState({ open: false, book: null });
          if (id && n > 0) handleInventoryUpdate(id, n);
        }}
      />
    </div>
  );
};

export default StaffDashboard;
