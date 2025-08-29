import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Grid, List } from 'lucide-react';
import { Book, User } from '../types';
import BookCard from './BookCard';
import BookDetails from './BookDetails';

interface BookSearchProps {
  books: Book[];
  currentUser: User;
  onBorrow: (book: Book) => void;
}

const BookSearch: React.FC<BookSearchProps> = ({ books, currentUser, onBorrow }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('title');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Normalize authors: prefer backend authors[]; fallback to author string
  const authorTextOf = (book: Book | any): string => {
    try {
      const arr = Array.isArray((book as any)?.authors) ? ((book as any).authors as string[]) : [];
      const joined = arr.filter(Boolean).join(', ');
      const single = String((book as any)?.author ?? '');
      return (joined || single).trim();
    } catch {
      return String((book as any)?.author ?? '').trim();
    }
  };

  const genres = useMemo(() => {
    const uniqueGenres = [...new Set(books.map(book => String(book.genre ?? '')))];
    return uniqueGenres.sort();
  }, [books]);

  const filteredAndSortedBooks = useMemo(() => {
    let filtered = books.filter(book => {
      const title = String(book.title ?? '');
  const author = authorTextOf(book);
      const genre = String(book.genre ?? '');
      const rating = Number(book.rating ?? 0);
      const copies = Number(book.copiesAvailable ?? 0);

      const matchesSearch =
        title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        genre.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesGenre = !selectedGenre || genre === selectedGenre;

      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available' && copies > 0) ||
        (availabilityFilter === 'unavailable' && copies === 0);

      const matchesRating = rating >= minRating;

      return matchesSearch && matchesGenre && matchesAvailability && matchesRating;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return String(a.title ?? '').localeCompare(String(b.title ?? ''));
        case 'author':
          return authorTextOf(a).localeCompare(authorTextOf(b));
        case 'rating':
          return (Number(b.rating ?? 0)) - (Number(a.rating ?? 0));
        case 'year':
          return (Number(b.publishedYear ?? 0)) - (Number(a.publishedYear ?? 0));
        case 'availability':
          return (Number(b.copiesAvailable ?? 0)) - (Number(a.copiesAvailable ?? 0));
        default:
          return 0;
      }
    });

    return filtered;
  }, [books, searchTerm, selectedGenre, availabilityFilter, minRating, sortBy]);

  // Reset to first page when filters/search/sort change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedGenre, availabilityFilter, minRating, sortBy]);

  const total = filteredAndSortedBooks.length;
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize;
  const endIndex = Math.min(total, startIndex + pageSize);
  const paginatedBooks = filteredAndSortedBooks.slice(startIndex, endIndex);

  if (selectedBook) {
    return (
      <BookDetails
        book={selectedBook}
        currentUser={currentUser}
        onBack={() => setSelectedBook(null)}
        onBorrow={onBorrow}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search and Filter Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {currentUser.role === 'staff' ? 'Book Catalog Management' : 'Discover Books'}
        </h1>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, author, or genre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Genre Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Genre</label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Genres</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            {/* Availability Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Books</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Rating</label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Any Rating</option>
                <option value={1}>1+ Stars</option>
                <option value={2}>2+ Stars</option>
                <option value={3}>3+ Stars</option>
                <option value={4}>4+ Stars</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="title">Title</option>
                <option value="author">Author</option>
                <option value="rating">Rating</option>
                <option value="year">Publication Year</option>
                <option value="availability">Availability</option>
              </select>
            </div>

            {/* View Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">View</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 px-3 py-2 flex items-center justify-center ${
                    viewMode === 'grid'
                      ? 'bg-blue-700 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 px-3 py-2 flex items-center justify-center ${
                    viewMode === 'list'
                      ? 'bg-blue-700 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">
          Showing {filteredAndSortedBooks.length} of {books.length} books
        </p>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Filter className="h-4 w-4" />
          <span>Filtered & Sorted</span>
        </div>
      </div>

      {/* Book Grid/List */}
      <div className={viewMode === 'grid'
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
        : 'space-y-4'
      }>
        {paginatedBooks.map(book => (
          <BookCard
            key={String(book.id)}
            book={book}
            onViewDetails={setSelectedBook}
            onBorrow={onBorrow}
            userRole={currentUser.role}
          />
        ))}
      </div>

      {filteredAndSortedBooks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No books found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
        </div>
      )}

      {/* Pagination footer */}
      {filteredAndSortedBooks.length > 0 && (
        <div className="flex items-center justify-between mt-8">
          <div className="text-sm text-gray-600">
            {total === 0 ? 'No results' : `Showing ${total === 0 ? 0 : startIndex + 1}-${endIndex} of ${total}`}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Per page:</label>
            <select
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
            <div className="flex items-center gap-1 ml-4">
              <button
                className="px-2 py-1 border rounded disabled:opacity-50"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <span className="mx-2 text-sm text-gray-700">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
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
      )}
    </div>
  );
};

export default BookSearch;
