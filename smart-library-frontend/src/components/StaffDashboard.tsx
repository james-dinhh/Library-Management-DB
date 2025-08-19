import React, { useState } from 'react';
import { 
  Users, BookOpen, Clock, AlertTriangle, TrendingUp, 
  Plus, Edit, Trash2, Eye, BarChart3, PieChart, Package,
  Search, CheckCircle, XCircle
} from 'lucide-react';
import { Book, User } from '../types';
import { mockBooks, mockUsers, mockBorrowRecords, mockAnalytics } from '../utils/mockData';
import { formatDate } from '../utils/helpers';
import BookForm from './BookForm';

interface StaffDashboardProps {
  currentUser: User;
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'users' | 'analytics'>('overview');
  const [books, setBooks] = useState<Book[]>(mockBooks);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showBookForm, setShowBookForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [sortBy, setSortBy] = useState('title');
  
  const analytics = mockAnalytics;
  const users = mockUsers.filter(user => user.role === 'user');
  const activeLoans = mockBorrowRecords.filter(record => record.status === 'borrowed');
  const overdueLoans = mockBorrowRecords.filter(record => record.status === 'overdue');

  const genres = [...new Set(books.map(book => book.genre))].sort();

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.isbn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = !filterGenre || book.genre === filterGenre;
    return matchesSearch && matchesGenre;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'author':
        return a.author.localeCompare(b.author);
      case 'availability':
        return b.copiesAvailable - a.copiesAvailable;
      case 'rating':
        return b.rating - a.rating;
      default:
        return 0;
    }
  });

  const handleSaveBook = (bookData: Omit<Book, 'id'>) => {
    if (selectedBook) {
      // Update existing book
      setBooks(books.map(book => 
        book.id === selectedBook.id 
          ? { ...bookData, id: selectedBook.id }
          : book
      ));
    } else {
      // Add new book
      const newBook: Book = {
        ...bookData,
        id: `book_${Date.now()}`
      };
      setBooks([...books, newBook]);
    }
    setShowBookForm(false);
    setSelectedBook(null);
  };

  const handleEditBook = (book: Book) => {
    setSelectedBook(book);
    setShowBookForm(true);
  };

  const handleDeleteBook = (bookId: string) => {
    if (window.confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
      setBooks(books.filter(book => book.id !== bookId));
    }
  };

  const handleCloseForm = () => {
    setShowBookForm(false);
    setSelectedBook(null);
  };

  const updateBookInventory = (bookId: string, totalCopies: number, copiesAvailable: number) => {
    setBooks(books.map(book => 
      book.id === bookId 
        ? { ...book, totalCopies, copiesAvailable }
        : book
    ));
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Dashboard</h1>
        <p className="text-gray-600">Welcome back, {currentUser.name}</p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-lg mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'inventory', label: 'Book Inventory', icon: BookOpen },
              { id: 'users', label: 'User Management', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-700 text-blue-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-8 w-8 text-blue-700" />
                    <div>
                      <div className="text-2xl font-bold text-blue-900">{analytics.totalBooks}</div>
                      <div className="text-sm text-blue-700">Total Books</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Users className="h-8 w-8 text-green-700" />
                    <div>
                      <div className="text-2xl font-bold text-green-900">{analytics.totalUsers}</div>
                      <div className="text-sm text-green-700">Active Users</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-8 w-8 text-yellow-700" />
                    <div>
                      <div className="text-2xl font-bold text-yellow-900">{analytics.activeBorrowings}</div>
                      <div className="text-sm text-yellow-700">Active Loans</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-8 w-8 text-red-700" />
                    <div>
                      <div className="text-2xl font-bold text-red-900">{analytics.overdueBooks}</div>
                      <div className="text-sm text-red-700">Overdue Books</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity & Overdue Books */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Borrowings */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Borrowings</h3>
                  <div className="space-y-3">
                    {activeLoans.slice(0, 5).map((loan) => {
                      const book = books.find(b => b.id === loan.bookId);
                      const user = users.find(u => u.id === loan.userId);
                      return (
                        <div key={loan.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{book?.title}</p>
                            <p className="text-sm text-gray-600">Borrowed by {user?.name}</p>
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(loan.borrowDate)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Popular Books */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Popular Books</h3>
                  <div className="space-y-3">
                    {analytics.topBooks.map((bookStat, index) => (
                      <div key={bookStat.bookId} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{bookStat.title}</p>
                            <p className="text-sm text-gray-600">{bookStat.borrowCount} borrows</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Header with Search and Filters */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 lg:mb-0">Book Inventory Management</h2>
                  <button
                    onClick={() => {
                      setSelectedBook(null);
                      setShowBookForm(true);
                    }}
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Book</span>
                  </button>
                </div>

                {/* Search and Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by title, author, or ISBN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <select
                      value={filterGenre}
                      onChange={(e) => setFilterGenre(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Genres</option>
                      {genres.map(genre => (
                        <option key={genre} value={genre}>{genre}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="title">Sort by Title</option>
                      <option value="author">Sort by Author</option>
                      <option value="availability">Sort by Availability</option>
                      <option value="rating">Sort by Rating</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                  Showing {filteredBooks.length} of {books.length} books
                </div>
              </div>

              {/* Book Management Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Genre</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBooks.map((book) => (
                        <tr key={book.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img
                                src={book.coverImageUrl}
                                alt={book.title}
                                className="w-12 h-16 object-cover rounded-lg mr-4"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{book.title}</div>
                                <div className="text-sm text-gray-500">ISBN: {book.isbn}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{book.author}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {book.genre}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1">
                                <Package className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">
                                  {book.copiesAvailable}/{book.totalCopies} available
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    book.copiesAvailable === 0 ? 'bg-red-500' :
                                    book.copiesAvailable <= book.totalCopies * 0.3 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${(book.copiesAvailable / book.totalCopies) * 100}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1">
                              <span className="text-sm text-gray-900">{book.rating.toFixed(1)}</span>
                              <span className="text-yellow-400 text-sm">★</span>
                              <span className="text-xs text-gray-500">({book.reviewCount})</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1">
                              {book.copiesAvailable > 0 ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className={`text-xs font-medium ${
                                book.copiesAvailable > 0 ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {book.copiesAvailable > 0 ? 'Available' : 'Out of Stock'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleEditBook(book)}
                                className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit book"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBook(book.id)}
                                className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete book"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {filteredBooks.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No books found</h3>
                    <p className="text-gray-500 mb-4">
                      {searchTerm || filterGenre 
                        ? 'Try adjusting your search criteria or filters.'
                        : 'Get started by adding your first book to the library.'
                      }
                    </p>
                    {!searchTerm && !filterGenre && (
                      <button
                        onClick={() => {
                          setSelectedBook(null);
                          setShowBookForm(true);
                        }}
                        className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 flex items-center space-x-2 mx-auto"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add First Book</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">User Management</h2>
              
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member Since</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Loans</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => {
                        const userActiveLoans = activeLoans.filter(loan => loan.userId === user.id).length;
                        return (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  className="w-10 h-10 rounded-full mr-4"
                                />
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(user.membershipDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                userActiveLoans > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {userActiveLoans} active
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button className="text-blue-600 hover:text-blue-800 mr-4">
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-8">
              <h2 className="text-xl font-bold text-gray-900">Library Analytics</h2>
              
              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly Borrowings */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Monthly Borrowings</span>
                  </h3>
                  <div className="space-y-3">
                    {analytics.monthlyBorrowings.map((month) => (
                      <div key={month.month} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{month.month}</span>
                        <div className="flex items-center space-x-2 flex-1 mx-4">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(month.count / 60) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-8">{month.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Popular Genres */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <PieChart className="h-5 w-5" />
                    <span>Popular Genres</span>
                  </h3>
                  <div className="space-y-3">
                    {analytics.popularGenres.map((genre, index) => (
                      <div key={genre.name} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{genre.name}</span>
                        <div className="flex items-center space-x-2 flex-1 mx-4">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'][index] || 'bg-gray-500'
                              }`}
                              style={{ width: `${(genre.count / 50) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-8">{genre.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Book Form Modal */}
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