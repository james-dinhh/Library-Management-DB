import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, BarChart3, Plus, MoreVertical, List } from 'lucide-react';
import { Book, User, StaffLog } from '../types';
import BookForm from './BookForm';
import API from '../services/api';
import { ConfirmDialog, PromptDialog } from './ui/dialogs';
import { useToast } from './ui/toast';

// --- Component ---
interface StaffDashboardProps {
  currentUser: User;
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'reports' | 'analytics' | 'logs'>('inventory');
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showBookForm, setShowBookForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // 'active', 'retired', or '' for all
  const [sortBy, setSortBy] = useState('title');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const toast = useToast();

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

  // Analytics state
  const [averageSessionTime, setAverageSessionTime] = useState<any[]>([]);
  const [mostHighlighted, setMostHighlighted] = useState<any[]>([]);
  const [topReadingTime, setTopReadingTime] = useState<any[]>([]);

  // Add state for MongoDB eBooks
  const [mongoBooks, setMongoBooks] = useState<any[]>([]);

  // Staff logs state
  const [logs, setLogs] = useState<StaffLog[]>([]);
  const [logFilterAction, setLogFilterAction] = useState<'' | 'add_book' | 'update_book' | 'retire_book'>('');
  const [logLoading, setLogLoading] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fetch books (server-side sorting + server filters; no pagination)
  useEffect(() => {
    const fetchPage = async () => {
      try {
        // Map UI sort to server sort where possible
        const serverSortBy = sortBy === 'availability' ? 'copiesAvailable' : (sortBy === 'title' ? 'title' : undefined);
    const { items } = await API.getBooksForDashboardPaged({
          q: searchTerm || undefined,
          genre: filterGenre || undefined,
          status: filterStatus || undefined,
          sortBy: serverSortBy as any,
          sortDir: 'asc',
        });
        // If UI asks to sort by author, do client sort on the current page
        const sortedItems = sortBy === 'author'
          ? [...items].sort((a: any, b: any) => (a.author || '').localeCompare(b.author || ''))
          : items;
        setBooks(sortedItems);
      } catch (err) {
    console.error('Failed to load books', err);
    const msg = (err as any)?.response?.data?.error || (err as any)?.message || 'Failed to load books';
    toast.show(msg, 'error');
      }
    };
    fetchPage();
  }, [searchTerm, filterGenre, filterStatus, sortBy]);

  // Fetch MongoDB eBooks on mount
  useEffect(() => {
  API.listMongoEbooks().then(setMongoBooks);
  }, []);

  // Fetch staff logs when tab is active or filters change
  useEffect(() => {
    if (activeTab !== 'logs') return;
    const load = async () => {
      try {
        setLogLoading(true);
        const data = await API.listStaffLogs({
          staffId: Number(currentUser.id) || undefined,
          actionType: logFilterAction || undefined,
        } as any);
        setLogs(data || []);
      } catch (err) {
        const msg = (err as any)?.response?.data?.error || (err as any)?.message || 'Failed to load staff logs';
        toast.show(msg, 'error');
      } finally {
        setLogLoading(false);
      }
    };
    load();
  }, [activeTab, logFilterAction, currentUser.id]);

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
  // Client-side search across title or author (backend q doesn't include author)
  const filteredBooks = books
    .filter(book => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term
        || (book.title || '').toLowerCase().includes(term)
        || (book.author || '').toLowerCase().includes(term);
      const matchesGenre = !filterGenre || book.genre === filterGenre;
      const matchesStatus = !filterStatus || book.status === filterStatus;
      return matchesSearch && matchesGenre && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title': {
          const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
          return collator.compare(a.title, b.title);
        }
        case 'author':
          return (a.author || '').localeCompare(b.author || '');
        case 'availability':
          return (b.copiesAvailable || 0) - (a.copiesAvailable || 0);
        default:
          return 0;
      }
    });

  // --- Handlers ---
  const handleSaveBook = async (_savedBook: any) => {
    try {
  // Refresh full list
      const serverSortBy = sortBy === 'availability' ? 'copiesAvailable' : (sortBy === 'title' ? 'title' : undefined);
  const { items } = await API.getBooksForDashboardPaged({
        q: searchTerm || undefined,
        genre: filterGenre || undefined,
        status: filterStatus || undefined,
        sortBy: serverSortBy as any,
        sortDir: 'asc',
      });
  setBooks(items);
      setShowBookForm(false);
      setSelectedBook(null);
      toast.show('Book saved', 'success');
    } catch (err) {
      toast.show('Failed to refresh book list', 'error');
    }
  };

  // Delete Book Handler
  const handleDeleteBook = async (bookId: number) => {
    try {
  await API.retireBook(Number(bookId), Number(currentUser.id));
      const serverSortBy = sortBy === 'availability' ? 'copiesAvailable' : (sortBy === 'title' ? 'title' : undefined);
  const { items } = await API.getBooksForDashboardPaged({
        q: searchTerm || undefined,
        genre: filterGenre || undefined,
        status: filterStatus || undefined,
        sortBy: serverSortBy as any,
        sortDir: 'asc',
      });
  setBooks(items);
      toast.show('Book retired', 'success');
    } catch (err) {
      toast.show('Failed to retire book', 'error');
    }
  };

  // Unretire Book Handler
  const handleUnretireBook = async (bookId: number) => {
    try {
      console.log('Unretiring book:', bookId, 'Staff ID:', currentUser.id);
  await API.unretireBook(Number(bookId), Number(currentUser.id));
      const serverSortBy = sortBy === 'availability' ? 'copiesAvailable' : (sortBy === 'title' ? 'title' : undefined);
  const { items } = await API.getBooksForDashboardPaged({
        q: searchTerm || undefined,
        genre: filterGenre || undefined,
        status: filterStatus || undefined,
        sortBy: serverSortBy as any,
        sortDir: 'asc',
      });
  setBooks(items);
      toast.show('Book unretired', 'success');
    } catch (err) {
      console.error('Unretire book error:', err);
      toast.show(`Failed to unretire book`, 'error');
    }
  };

  // Inventory Update Handler
  const handleInventoryUpdate = async (bookId: number, newTotal: number) => {
    try {
  await API.updateBookInventory(Number(bookId), Number(currentUser.id), newTotal);
      const serverSortBy = sortBy === 'availability' ? 'copiesAvailable' : (sortBy === 'title' ? 'title' : undefined);
  const { items } = await API.getBooksForDashboardPaged({
        q: searchTerm || undefined,
        genre: filterGenre || undefined,
        status: filterStatus || undefined,
        sortBy: serverSortBy as any,
        sortDir: 'asc',
      });
  setBooks(items);
      toast.show('Inventory updated', 'success');
    } catch (err) {
      toast.show('Failed to update inventory', 'error');
    }
  };

  const handleCloseForm = () => {
    setShowBookForm(false);
    setSelectedBook(null);
  };

  // ------ Report handlers -----
  // Generate Most Borrowed Report
  const handleGenerateMostBorrowed = async () => {
    try {
  const data = await API.reportsMostBorrowed(dateRange.start, dateRange.end);
      setMostBorrowed(data);
    } catch (err) {
    console.error('Failed to generate Most Borrowed report', err);
    const msg = (err as any)?.response?.data?.error || (err as any)?.message || 'Failed to generate Most Borrowed report';
    toast.show(msg, 'error');
    }
  };

  // Generate Top Readers Report
  const handleGenerateTopReaders = async () => {
    try {
  const data = await API.reportsTopReaders();
      setTopReaders(data);
    } catch (err) {
    console.error('Failed to generate Top Readers report', err);
    const msg = (err as any)?.response?.data?.error || (err as any)?.message || 'Failed to generate Top Readers report';
    toast.show(msg, 'error');
    }
  };

  // Generate Low Availability Report
  const handleGenerateLowAvailability = async () => {
    try {
  const data = await API.reportsLowAvailability();
      setLowAvailability(data);
    } catch (err) {
    console.error('Failed to generate Low Availability report', err);
    const msg = (err as any)?.response?.data?.error || (err as any)?.message || 'Failed to generate Low Availability report';
    toast.show(msg, 'error');
    }
  };

  // ----- Analytics handlers -----
  // Generate Average Session Time Analytics
  const handleGenerateAverageSessionTime = async () => {
    try {
  const data = await API.analyticsAvgSessionTime();
      setAverageSessionTime(data.results);
    } catch (err) {
    console.error('Failed to load Average Session Time analytics', err);
    const msg = (err as any)?.response?.data?.error || (err as any)?.message || 'Failed to load Average Session Time';
    toast.show(msg, 'error');
    }
  };

  // Generate Most Highlighted Analytics
  const handleGenerateMostHighlighted = async () => {
    try {
  const data = await API.analyticsMostHighlightedBooks();
      // backend returns { start, end, count, results: [...] }
      setMostHighlighted(data.results);
    } catch (err) {
    console.error('Failed to load Most Highlighted Books analytics', err);
    const msg = (err as any)?.response?.data?.error || (err as any)?.message || 'Failed to load Most Highlighted Books';
    toast.show(msg, 'error');
    }
  };

  // Generate Top Reading Time Analytics
  const handleGenerateTopReadingTime = async () => {
    try {
  const data = await API.analyticsTopBooksByReadingTime();
      setTopReadingTime(data.results);
    } catch (err) {
    console.error('Failed to load Top Books by Reading Time analytics', err);
    const msg = (err as any)?.response?.data?.error || (err as any)?.message || 'Failed to load Top Books by Reading Time';
    toast.show(msg, 'error');
    }
  };

  function getMongoBookTitle(bookId: number) {
    const book = mongoBooks.find(b => b.bookId === bookId);
    return book ? `${book.title} by ${book.author}` : `Book ${bookId}`;
  }

  // Format average session time adaptively in minutes or hours per session
  const formatAvgSession = (minutes: number) => {
    const m = Number(minutes);
    if (!Number.isFinite(m) || m <= 0) return '0 min/session';
    if (m >= 60) {
      const hours = m / 60;
      return `${hours.toFixed(2)} hr/session`;
    }
    return `${m.toFixed(2)} min/session`;
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

            {/* Analytics tab button */}
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

            {/* Logs tab button */}
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 ${
                activeTab === 'logs'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <List className="h-4 w-4" />
              <span>Staff Logs</span>
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
                      {/* Inventory cell */}
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
              {/* No pagination: showing all books */}
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

        {/* --- Analytics Tab --- */}
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
                    {(u.userName || `User ${u.userId}`)} — {formatAvgSession(u.avgSessionMinutes)} ({u.sessions} sessions)
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
                    {(b.title || getMongoBookTitle(b.bookId))} — {b.totalHighlights} highlights
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
                    {(b.title || getMongoBookTitle(b.bookId))} — {b.totalReadingHours} hours read ({b.sessions} sessions)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* --- Staff Logs Tab --- */}
        {activeTab === 'logs' && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Staff Logs</h2>
              <div className="flex items-center space-x-2">
                <select
                  value={logFilterAction}
                  onChange={(e) => setLogFilterAction(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">All actions</option>
                  <option value="add_book">Add Book</option>
                  <option value="update_book">Update Book</option>
                  <option value="retire_book">Retire Book</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading logs…</td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No logs to display</td>
                    </tr>
                  ) : (
                    logs.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(l.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{l.staffName || `User ${l.staffId}`}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            l.actionType === 'retire_book' ? 'bg-red-100 text-red-800' :
                            l.actionType === 'update_book' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {l.actionType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{l.bookTitle || (l.bookId ? `Book ${l.bookId}` : '—')}</td>
                      </tr>
                    ))
                  )}
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
