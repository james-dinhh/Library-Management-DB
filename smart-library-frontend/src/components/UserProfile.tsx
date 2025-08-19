import React, { useState } from 'react';
import { User, Calendar, BookOpen, Star, ChevronRight, Award, TrendingUp } from 'lucide-react';
import { User as UserType, BorrowRecord } from '../types';
import { mockBorrowRecords, mockBooks, mockReviews } from '../utils/mockData';
import { formatDate, calculateDaysUntilDue } from '../utils/helpers';

interface UserProfileProps {
  currentUser: UserType;
}

const UserProfile: React.FC<UserProfileProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'reviews'>('overview');
  
  const userBorrowRecords = mockBorrowRecords.filter(record => record.userId === currentUser.id);
  const userReviews = mockReviews.filter(review => review.userId === currentUser.id);
  const activeBorrowings = userBorrowRecords.filter(record => record.status === 'borrowed');
  
  const getBooksWithRecords = (records: BorrowRecord[]) => {
    return records.map(record => ({
      record,
      book: mockBooks.find(book => book.id === record.bookId)!
    }));
  };

  const activeBooksWithRecords = getBooksWithRecords(activeBorrowings);
  const allBooksWithRecords = getBooksWithRecords(userBorrowRecords);

  const stats = {
    totalBorrowed: userBorrowRecords.length,
    currentlyBorrowed: activeBorrowings.length,
    reviewsWritten: userReviews.length,
    averageRating: userReviews.length > 0 
      ? (userReviews.reduce((sum, review) => sum + review.rating, 0) / userReviews.length).toFixed(1)
      : '0'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-24 h-24 rounded-full object-cover shadow-lg"
          />
          
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentUser.name}</h1>
            <p className="text-gray-600 mb-4">{currentUser.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Member since {formatDate(currentUser.membershipDate)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Award className="h-4 w-4" />
                <span className="capitalize">{currentUser.role}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="text-2xl font-bold text-blue-700">{stats.totalBorrowed}</div>
              <div className="text-xs text-blue-600">Books Borrowed</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl">
              <div className="text-2xl font-bold text-green-700">{stats.reviewsWritten}</div>
              <div className="text-xs text-green-600">Reviews Written</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-lg mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-8">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'history', label: 'Borrowing History', icon: BookOpen },
              { id: 'reviews', label: 'My Reviews', icon: Star }
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
              {/* Dashboard Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-8 w-8 text-blue-700" />
                    <div>
                      <div className="text-2xl font-bold text-blue-900">{stats.currentlyBorrowed}</div>
                      <div className="text-sm text-blue-700">Currently Borrowed</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-8 w-8 text-green-700" />
                    <div>
                      <div className="text-2xl font-bold text-green-900">{stats.totalBorrowed}</div>
                      <div className="text-sm text-green-700">Total Borrowed</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Star className="h-8 w-8 text-yellow-700" />
                    <div>
                      <div className="text-2xl font-bold text-yellow-900">{stats.averageRating}</div>
                      <div className="text-sm text-yellow-700">Avg Rating Given</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Award className="h-8 w-8 text-purple-700" />
                    <div>
                      <div className="text-2xl font-bold text-purple-900">{stats.reviewsWritten}</div>
                      <div className="text-sm text-purple-700">Reviews Written</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Currently Borrowed Books */}
              {activeBooksWithRecords.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Currently Borrowed Books</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeBooksWithRecords.map(({ book, record }) => {
                      const daysUntilDue = calculateDaysUntilDue(record.dueDate);
                      const isOverdue = daysUntilDue < 0;
                      
                      return (
                        <div key={record.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                          <div className="flex space-x-3">
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{book.title}</h3>
                              <p className="text-sm text-gray-600 truncate">{book.author}</p>
                              <div className="mt-2">
                                <p className="text-xs text-gray-500">Due: {formatDate(record.dueDate)}</p>
                                <p className={`text-xs font-medium ${
                                  isOverdue ? 'text-red-600' : daysUntilDue <= 3 ? 'text-yellow-600' : 'text-green-600'
                                }`}>
                                  {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : 
                                   daysUntilDue === 0 ? 'Due today' : 
                                   `${daysUntilDue} days left`}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Borrowing History</h2>
              <div className="space-y-4">
                {allBooksWithRecords.map(({ book, record }) => (
                  <div key={record.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{book.title}</h3>
                      <p className="text-sm text-gray-600">{book.author}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>Borrowed: {formatDate(record.borrowDate)}</span>
                        <span>Due: {formatDate(record.dueDate)}</span>
                        {record.returnDate && (
                          <span>Returned: {formatDate(record.returnDate)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        record.status === 'returned' ? 'bg-green-100 text-green-800' :
                        record.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}
                
                {allBooksWithRecords.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No borrowing history yet</p>
                    <p>Start exploring our collection to see your history here.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">My Reviews</h2>
              <div className="space-y-6">
                {userReviews.map((review) => {
                  const book = mockBooks.find(b => b.id === review.bookId);
                  return (
                    <div key={review.id} className="border border-gray-200 rounded-xl p-6">
                      <div className="flex items-start space-x-4">
                        {book && (
                          <img
                            src={book.coverImage}
                            alt={book.title}
                            className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{book?.title}</h3>
                            <span className="text-sm text-gray-500">{formatDate(review.date)}</span>
                          </div>
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="flex text-yellow-400">
                              {'★'.repeat(review.rating)}
                              {'☆'.repeat(5 - review.rating)}
                            </div>
                            <span className="text-sm text-gray-600">{review.rating}/5 stars</span>
                          </div>
                          <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {userReviews.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Star className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No reviews written yet</p>
                    <p>Share your thoughts on books you've read to help other members.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;