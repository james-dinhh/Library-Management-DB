import React, { useState, useMemo } from 'react';
import { Search, Filter, Grid, List } from 'lucide-react';
import { Book, User } from '../types';
import BookCard from './BookCard';
import BookDetails from './BookDetails';

interface BookSearchProps {
  books: Book[];
  currentUser: User;
  onBorrow: (book: Book) => void;
  onRefreshBooks?: () => Promise<void>;
}

const BookSearch: React.FC<BookSearchProps> = ({ books: initialBooks, currentUser, onBorrow, onRefreshBooks }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('title');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const allBooks = initialBooks;

  // Normalize author text for search/sort
  const authorTextOf = (book: Book): string => {
    const arr = Array.isArray((book as any)?.authors) ? ((book as any).authors as string[]) : [];
    const joined = arr.filter(Boolean).join(', ');
    const single = String((book as any)?.author ?? '');
    return (joined || single).trim();
  };

  // Apply filters and sorting client-side
  const displayBooks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = allBooks.filter((book) => {
      // search across title, author(s), and genre
      const inSearch = term
        ? (
            String(book.title ?? '').toLowerCase().includes(term) ||
            authorTextOf(book).toLowerCase().includes(term) ||
            String(book.genre ?? '').toLowerCase().includes(term)
          )
        : true;

      // genre filter
      const inGenre = selectedGenre ? String(book.genre ?? '') === selectedGenre : true;

      // availability filter
      const copies = Number((book as any).copiesAvailable ?? 0);
      const inAvailability =
        availabilityFilter === 'all'
          ? true
          : availabilityFilter === 'available'
          ? copies > 0
          : copies <= 0; // 'unavailable'

      // rating filter
      const rating = Number((book as any).rating ?? 0);
      const inRating = rating >= minRating;

      return inSearch && inGenre && inAvailability && inRating;
    });

    const sorted = [...filtered].sort((a, b) => {
      const av = a as any;
      const bv = b as any;
      switch (sortBy) {
        case 'author':
          return authorTextOf(a).localeCompare(authorTextOf(b));
        case 'rating':
          return Number(av.rating ?? 0) - Number(bv.rating ?? 0);
        case 'year':
          return Number(av.publishedYear ?? 0) - Number(bv.publishedYear ?? 0);
        case 'availability':
          return Number(av.copiesAvailable ?? 0) - Number(bv.copiesAvailable ?? 0);
        case 'title':
        default:
          return String(a.title ?? '').localeCompare(String(b.title ?? ''));
      }
    });

    return sorted;
  }, [allBooks, searchTerm, selectedGenre, availabilityFilter, minRating, sortBy]);

  const genres = useMemo(() => {
    return [...new Set(allBooks.map(book => String(book.genre ?? '')))].sort();
  }, [allBooks]);

  if (selectedBook) {
    return (
      <BookDetails
        book={selectedBook}
        currentUser={currentUser}
        onBack={() => setSelectedBook(null)}
        onBorrow={onBorrow}
        onRefreshBooks={onRefreshBooks}
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
      Showing {displayBooks.length} of {allBooks.length} books
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
        {displayBooks.map((book: Book) => (
          <BookCard
            key={String(book.id)}
            book={book}
            onViewDetails={setSelectedBook}
            onBorrow={onBorrow}
            userRole={currentUser.role}
          />
        ))}
      </div>

      {displayBooks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No books found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
        </div>
      )}
    </div>
  );
};

export default BookSearch;
