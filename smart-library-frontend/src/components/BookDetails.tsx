import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MessageCircle, User, Heart, Share2 } from 'lucide-react';
import { Book, User as UserType } from '../types';
import { formatDate, getAvailabilityStatus } from '../utils/helpers';

interface BookDetailsProps {
  book: Book;
  currentUser: UserType;
  onBack: () => void;
  onBorrow: (book: Book) => void;
}

const BookDetails: React.FC<BookDetailsProps> = ({ book, currentUser, onBack, onBorrow }) => {
  const [bookReviews, setBookReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);

  const availability = getAvailabilityStatus(book.copiesAvailable);

  // Fetch reviews from backend
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        const response = await fetch(`/reviews/book/${book.id}`);
        if (!response.ok) throw new Error('Failed to fetch reviews');
        const data = await response.json();
        setBookReviews(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [book.id]);

  // Submit new review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          bookId: book.id,
          rating: newReview.rating,
          comment: newReview.comment,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit review');

      // Option 1: refetch all reviews
      const refreshed = await fetch(`/reviews/book/${book.id}`);
      const data = await refreshed.json();
      setBookReviews(data);

      // Option 2: append new review without refetch
      // setBookReviews(prev => [...prev, { ...newReview, userName: currentUser.name, date: new Date().toISOString(), id: Date.now() }]);

      setShowReviewForm(false);
      setNewReview({ rating: 5, comment: '' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-blue-700 hover:text-blue-800 mb-6 transition-colors duration-200"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Search</span>
      </button>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Book Header */}
        <div className="md:flex">
          {/* Book Cover */}
          <div className="md:w-1/3 lg:w-1/4">
            <img
              src={book.coverImage}
              alt={book.title}
              className="w-full h-96 md:h-full object-cover"
            />
          </div>

          {/* Book Info */}
          <div className="md:w-2/3 lg:w-3/4 p-8">
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{book.title}</h1>
                    <p className="text-xl text-gray-600 mb-4">by {book.author}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Heart className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Rating and Meta Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="flex text-yellow-400">
                      {'★'.repeat(Math.floor(book.rating))}
                      {'☆'.repeat(5 - Math.floor(book.rating))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {book.rating.toFixed(1)} ({book.reviewCount} reviews)
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Published {book.publishedYear}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Genre:</span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {book.genre}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">ISBN:</span>
                    <span className="text-sm font-mono">{book.isbn}</span>
                  </div>
                </div>

                {/* Availability */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Availability</h3>
                      <p className={`text-sm font-medium ${availability.color}`}>
                        {availability.status} - {book.copiesAvailable} of {book.totalCopies} copies available
                      </p>
                    </div>
                    {currentUser.role === 'user' && book.copiesAvailable > 0 && (
                      <button
                        onClick={() => onBorrow(book)}
                        className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 font-medium"
                      >
                        Borrow Book
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{book.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="border-t border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Reviews & Ratings</h2>
            {currentUser.role === 'user' && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 flex items-center space-x-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Write Review</span>
              </button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && currentUser.role === 'user' && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <form onSubmit={handleSubmitReview}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setNewReview(prev => ({ ...prev, rating }))}
                        className={`text-2xl ${
                          rating <= newReview.rating ? 'text-yellow-400' : 'text-gray-300'
                        } hover:text-yellow-400 transition-colors`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                  <textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Share your thoughts about this book..."
                    required
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200"
                  >
                    Submit Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Reviews List */}
          {loadingReviews ? (
            <p className="text-gray-500">Loading reviews...</p>
          ) : bookReviews.length > 0 ? (
            <div className="space-y-4">
              {bookReviews.map((review) => (
                <div key={review.id} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <User className="h-10 w-10 text-gray-400 bg-gray-100 rounded-full p-2" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{review.userName}</h4>
                        <div className="flex text-yellow-400 text-sm">
                          {'★'.repeat(review.rating)}
                          {'☆'.repeat(5 - review.rating)}
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(review.date)}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No reviews yet. Be the first to review this book!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDetails;