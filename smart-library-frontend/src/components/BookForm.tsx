import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Book } from '../types';
import API from '../services/api';

interface BookFormProps {
  staffId: number;
  book?: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (book: any) => void; // Changed to accept the saved book from API
}

const BookForm: React.FC<BookFormProps> = ({ staffId, book, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    coverImageUrl: '',
    totalCopies: 1,
    publishedYear: new Date().getFullYear(),
    rating: 0,
    reviewCount: 0,
    publisherId: 1 // Default to first publisher
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const genres = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction',
    'Fantasy', 'Biography', 'History', 'Self-Help', 'Business',
    'Classic Literature', 'Dystopian Fiction', 'Coming-of-age',
    'Thriller', 'Horror', 'Poetry', 'Drama', 'Adventure'
  ];

  const publishers = [
    { id: 1, name: 'Lotus Books' },
    { id: 2, name: 'Dragon Press' },
    { id: 3, name: 'Sunrise Publishing' },
    { id: 4, name: 'Wanderlust Press' }
  ];

  const stockImages = [
    'https://images.pexels.com/photos/1130980/pexels-photo-1130980.jpeg',
    'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg',
    'https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg',
    'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg',
    'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg'
  ];

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title,
        genre: book.genre,
        coverImageUrl: book.coverImageUrl,
        totalCopies: book.totalCopies,
        publishedYear: book.publishedYear,
        rating: book.rating,
        reviewCount: book.reviewCount,
        publisherId: 1 // Default for existing books
      });
    } else {
      setFormData({
        title: '',
        genre: '',
        coverImageUrl: stockImages[0],
        totalCopies: 1,
        publishedYear: new Date().getFullYear(),
        rating: 0,
        reviewCount: 0,
        publisherId: 1 // Default to first publisher
      });
    }
    setErrors({});
  }, [book, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.genre) newErrors.genre = 'Genre is required';
    if (!formData.publisherId) newErrors.publisherId = 'Publisher is required';
    if (!formData.isbn.trim()) newErrors.isbn = 'ISBN is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.totalCopies < 1) newErrors.totalCopies = 'Total copies must be at least 1';
    if (formData.copiesAvailable < 0) newErrors.copiesAvailable = 'Available copies cannot be negative';
    if (formData.copiesAvailable > formData.totalCopies) {
      newErrors.copiesAvailable = 'Available copies cannot exceed total copies';
    }
    if (formData.publishedYear < 1000 || formData.publishedYear > new Date().getFullYear()) {
      newErrors.publishedYear = 'Please enter a valid publication year';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return; // stop if validation fails
    setIsSubmitting(true);

    try {
      let savedBook;

      if (book) {
        // Update existing book - TODO: implement update endpoint
        throw new Error('Book update not implemented yet');
      } else {
        // Create new book
        // Get the current user (staff member) from localStorage or context
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const staffId = currentUser.id || 2; // Default to Bob's ID if not found
        
        const bookData = {
          staffId: Number(staffId), // Ensure it's a number
          title: formData.title,
          genre: formData.genre,
          publisherId: Number(formData.publisherId), // Ensure it's a number
          copiesTotal: Number(formData.totalCopies), // Ensure it's a number
          publishedYear: formData.publishedYear ? Number(formData.publishedYear) : undefined,
          coverImageUrl: formData.coverImageUrl || undefined
        };

        savedBook = await API.createBook(bookData);
      }

      onSave(savedBook); // pass the saved book back to parent
      onClose();
    } catch (error) {
      // Extract more detailed error information
      let errorMessage = 'Something went wrong while saving the book.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // If it's an axios error, try to get the response data
        if (error.message.includes('400') || error.message.includes('500')) {
          try {
            // Try to parse additional error info from axios error
            const axiosError = error as any;
            if (axiosError.response?.data?.error) {
              errorMessage = `Server Error: ${axiosError.response.data.error}`;
            }
          } catch (parseError) {
            // Fallback to original error message
          }
        }
      }
      
      alert(`Failed to save book: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">{book ? 'Edit Book' : 'Add New Book'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.title ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="Enter book title"
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" /> {errors.title}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Genre *</label>
                      <select
                        value={formData.genre}
                        onChange={(e) => handleInputChange('genre', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.genre ? 'border-red-300' : 'border-gray-300'}`}
                      >
                        <option value="">Select genre</option>
                        {genres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
                      </select>
                      {errors.genre && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" /> {errors.genre}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Publisher *
                      </label>
                      <select
                        value={formData.publisherId}
                        onChange={(e) => handleInputChange('publisherId', parseInt(e.target.value))}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.publisherId ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select publisher</option>
                        {publishers.map(publisher => (
                          <option key={publisher.id} value={publisher.id}>{publisher.name}</option>
                        ))}
                      </select>
                      {errors.publisherId && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.publisherId}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Publication Year *
                    </label>
                    <input
                      type="number"
                      value={formData.publishedYear}
                      onChange={(e) => handleInputChange('publishedYear', parseInt(e.target.value))}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.publishedYear ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="1000"
                      max={new Date().getFullYear()}
                    />
                    {errors.publishedYear && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.publishedYear}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Publisher ID *</label>
                    <input
                      type="number"
                      value={formData.publisherId}
                      onChange={(e) => handleInputChange('publisherId', parseInt(e.target.value) || 0)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.publisherId ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="Enter publisher ID"
                      min={1}
                    />
                    {errors.publisherId && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" /> {errors.publisherId}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Copies *</label>
                    <input
                      type="number"
                      value={formData.totalCopies}
                      onChange={(e) => handleInputChange('totalCopies', parseInt(e.target.value) || 0)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.totalCopies ? 'border-red-300' : 'border-gray-300'}`}
                      min="1"
                    />
                    {errors.totalCopies && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" /> {errors.totalCopies}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Cover Image */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cover Image</h3>
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <img
                      src={formData.coverImageUrl}
                      alt="Book cover preview"
                      className="w-32 h-40 object-cover rounded-lg shadow-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                    <input
                      type="url"
                      value={formData.coverImageUrl}
                      onChange={(e) => handleInputChange('coverImageUrl', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Or choose from stock images:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {stockImages.map((image, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleInputChange('coverImageUrl', image)}
                          className={`relative rounded-lg overflow-hidden border-2 transition-all ${formData.coverImageUrl === image ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <img src={image} alt={`Stock image ${index + 1}`} className="w-full h-16 object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{book ? 'Update Book' : 'Add Book'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookForm;