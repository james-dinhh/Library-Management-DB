import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MessageCircle, User, Heart, Share2 } from 'lucide-react';
import { Book, User as UserType } from '../types';
import { formatDate, getAvailabilityStatus } from '../utils/helpers';

const API_BASE = "http://localhost:4000";

interface BookDetailsProps {
  book?: Book | null;
  currentUser?: UserType | null;
  onBack: () => void;
  onBorrow: (book: Book) => void;
}

const BookDetails: React.FC<BookDetailsProps> = ({ book, currentUser, onBack, onBorrow }) => {
  // If book or currentUser are missing, show fallback UI
  if (!book || !currentUser) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Book or user data is not available.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const [bookReviews, setBookReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);

  const availability = getAvailabilityStatus(book.copiesAvailable ?? 0);

  // Fetch reviews from backend
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        if (!book?.id) return;
        const response = await fetch(`${API_BASE}/reviews/book/${book.id}`);
        if (!response.ok) throw new Error('Failed to fetch reviews');
        const data = await response.json();
        setBookReviews(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setBookReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [book.id]);

  // Submit new review
  const handleSubmitReview = async (e: React.FormEvent) => {
  e.preventDefault();

  // TEMP: User functionality not ready, skip submitting review
  console.log("Submit review skipped: user functionality not implemented yet.");

  // Optionally, clear the form and hide it
  setShowReviewForm(false);
  setNewReview({ rating: 5, comment: '' });

  // ❌ Comment out the real POST request until userId is available
  /*
  if (!book?.id || !currentUser?.id) return;

  try {
    const response = await fetch(`${API_BASE}/reviews`, {
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

    const refreshed = await fetch(`${API_BASE}/reviews/book/${book.id}`);
    const data = await refreshed.json();
    setBookReviews(Array.isArray(data) ? data : []);

    setShowReviewForm(false);
    setNewReview({ rating: 5, comment: '' });
  } catch (err) {
    console.error(err);
  }
  */
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

      {/* Book Info */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/3 lg:w-1/4">
            <img
              src={book.coverImageUrl ?? 'https://via.placeholder.com/300x400'}
              alt={book.title ?? 'Untitled'}
              className="w-full h-96 md:h-full object-cover"
            />
          </div>

          <div className="md:w-2/3 lg:w-3/4 p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{book.title ?? 'Untitled'}</h1>
            <p className="text-xl text-gray-600 mb-4">by {book.author ?? 'Unknown'}</p>
            <div className="flex items-center space-x-2 text-gray-600 mb-4">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Published {book.publishedYear ?? 'Unknown'}</span>
            </div>
            <div className="mb-4">
              <p className={`text-sm font-medium ${availability.color}`}>
                {availability.status} - {book.copiesAvailable ?? 0} of {book.totalCopies ?? 0} copies available
              </p>
              {currentUser.role === 'reader' && (book.copiesAvailable ?? 0) > 0 && (
                <button
                  onClick={() => onBorrow(book)}
                  className="mt-2 px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200"
                >
                  Borrow Book
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reviews */}
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

          {showReviewForm && currentUser.role === 'user' && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <form onSubmit={handleSubmitReview}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex space-x-2 mb-4">
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

                <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                <textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                  placeholder="Share your thoughts about this book..."
                  required
                />

                <div className="flex space-x-3">
                  <button type="submit" className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200">
                    Submit Review
                  </button>
                  <button type="button" onClick={() => setShowReviewForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {loadingReviews ? (
            <p className="text-gray-500">Loading reviews...</p>
          ) : bookReviews.length > 0 ? (
            <div className="space-y-4">
              {bookReviews.map((review) => (
                <div key={review.id} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start space-x-4">
                    <User className="h-10 w-10 text-gray-400 bg-gray-100 rounded-full p-2 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{review.userName ?? 'Anonymous'}</h4>
                        <div className="flex text-yellow-400 text-sm">
                          {'★'.repeat(review.rating ?? 0)}
                          {'☆'.repeat(5 - (review.rating ?? 0))}
                        </div>
                        <span className="text-sm text-gray-500">{formatDate(review.date ?? '')}</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{review.comment ?? ''}</p>
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
