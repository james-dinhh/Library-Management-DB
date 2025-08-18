import React from 'react';
import { Star, Calendar, Eye, Heart } from 'lucide-react';
import { Book } from '../types';
import { getAvailabilityStatus } from '../utils/helpers';

interface BookCardProps {
  book: Book;
  onViewDetails: (book: Book) => void;
  onBorrow?: (book: Book) => void;
  userRole: 'user' | 'staff';
}

const BookCard: React.FC<BookCardProps> = ({ book, onViewDetails, onBorrow, userRole }) => {
  const availability = getAvailabilityStatus(book.availableCopies);

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
      <div className="relative">
        <img
          src={book.coverImage}
          alt={book.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Heart className="h-4 w-4 text-gray-600 hover:text-red-500 cursor-pointer transition-colors" />
        </div>
        <div className={`absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-medium text-white ${
          book.availableCopies > 0 ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {availability.status}
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-700 transition-colors">
          {book.title}
        </h3>
        <p className="text-gray-600 text-sm mb-2">by {book.author}</p>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-1">
            <div className="flex text-yellow-400 text-sm">
              {'★'.repeat(Math.floor(book.rating))}
              {'☆'.repeat(5 - Math.floor(book.rating))}
            </div>
            <span className="text-sm text-gray-600 ml-1">
              {book.rating.toFixed(1)} ({book.reviewCount})
            </span>
          </div>
          <span className="text-xs text-gray-500 flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {book.publishedYear}
          </span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {book.genre}
          </span>
          <span className="text-sm text-gray-600">
            {book.availableCopies}/{book.totalCopies} available
          </span>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => onViewDetails(book)}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm font-medium flex items-center justify-center space-x-1"
          >
            <Eye className="h-4 w-4" />
            <span>View Details</span>
          </button>
          
          {userRole === 'user' && book.availableCopies > 0 && onBorrow && (
            <button
              onClick={() => onBorrow(book)}
              className="flex-1 px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 text-sm font-medium"
            >
              Borrow
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCard;