import React from 'react';
import { Calendar, Eye } from 'lucide-react';
import { Book } from '../types';
import { getAvailabilityStatus } from '../utils/helpers';

interface BookCardProps {
  book: Book;
  onViewDetails: (book: Book) => void;
  onBorrow?: (book: Book) => void;
  userRole: 'reader' | 'staff';
}

const BookCard: React.FC<BookCardProps> = ({ book, onViewDetails, onBorrow, userRole }) => {
  const availability = getAvailabilityStatus(book.copiesAvailable ?? 0, book.status);

  // Calculate average rating from reviews if available
  const calculateAverageRating = () => {
    if (book.reviews && book.reviews.length > 0) {
      const totalRating = book.reviews.reduce((sum, review) => sum + review.rating, 0);
      return totalRating / book.reviews.length;
    }
    return book.rating ?? 0;
  };

  const rating = calculateAverageRating();
  const reviewCount = book.reviews?.length ?? book.reviewCount ?? 0;

  const availableCopies = typeof book.copiesAvailable === 'number' ? book.copiesAvailable : 0;
  const totalCopies = typeof book.totalCopies === 'number' ? book.totalCopies : 0;
  const publishedYear = book.publishedYear ?? 'Unknown';
  const genre = book.genre ?? 'Unknown';
  const title = book.title ?? 'Untitled';
  const author =
    Array.isArray(book.authors) && book.authors.length > 0
      ? book.authors.join(', ')
      : 'Unknown';
  //const coverImageUrl = book.coverImageUrl ?? 'https://via.placeholder.com/150';

  // Determine if book is borrowable: must be active status AND have available copies
  const isBorrowable = book.status === 'active' && availableCopies > 0;

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
      <div className="relative">
        <img
          src="/book.jpg"
          alt={title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div
          className={`absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-medium text-white ${
            book.status === 'retired' 
              ? 'bg-gray-600' 
              : availableCopies > 0 
                ? 'bg-green-600' 
                : 'bg-red-600'
          }`}
        >
          {availability.status}
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-700 transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 text-sm mb-2">by {author}</p>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-1">
            <div className="flex text-yellow-400 text-sm">
              {'★'.repeat(Math.floor(rating))}
              {'☆'.repeat(5 - Math.floor(rating))}
            </div>
            <span className="text-sm text-gray-600 ml-1">
              {rating.toFixed(1)} ({reviewCount})
            </span>
          </div>
          <span className="text-xs text-gray-500 flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {publishedYear}
          </span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {genre}
          </span>
          <span className="text-sm text-gray-600">
            {availableCopies}/{totalCopies} available
          </span>
        </div>

        <div className="flex flex-col space-y-2">
          <button
            onClick={() => onViewDetails(book)}
            className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm font-medium flex items-center justify-center space-x-1"
          >
            <Eye className="h-4 w-4" />
            <span>View Details</span>
          </button>

          {(userRole === 'reader' || userRole === 'staff') && isBorrowable && onBorrow && (
            <button
              onClick={() => onBorrow(book)}
              className="w-full px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 text-sm font-medium"
            >
              Borrow
            </button>
          )}

          {/* Show disabled button with explanation for non-borrowable books */}
          {(userRole === 'reader' || userRole === 'staff') && !isBorrowable && onBorrow && (
            <button
              disabled
              className="w-full px-3 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed text-sm font-medium"
              title={book.status === 'retired' ? 'This book has been retired' : 'Currently out of stock'}
            >
              {book.status === 'retired' ? 'Retired' : 'Out of Stock'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCard;
