import React, { useEffect, useState } from 'react';
import { X, Save, AlertCircle, Plus, Search, XCircle } from 'lucide-react';
import { Book } from '../types';
import API from '../services/api';
import { useToast } from './ui/toast';

interface BookFormProps {
  staffId: number;
  book?: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (book: any) => void; // accept the saved book from API
}

type Option = { id: number; name: string };

const BookForm: React.FC<BookFormProps> = ({ staffId, book, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    coverImageUrl: '',
    totalCopies: 1,
    publishedYear: new Date().getFullYear(),
    rating: 0,
    reviewCount: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Publisher searchable select
  const [publisherQuery, setPublisherQuery] = useState('');
  const [debouncedPublisherQuery, setDebouncedPublisherQuery] = useState('');
  const [publisherOptions, setPublisherOptions] = useState<Option[]>([]);
  const [selectedPublisher, setSelectedPublisher] = useState<Option | null>(null);
  const [showPublisherAdd, setShowPublisherAdd] = useState(false);
  const [newPublisher, setNewPublisher] = useState({ name: '', address: '' });
  const [publisherOpen, setPublisherOpen] = useState(false);

  // Authors multi-select
  const [authorQuery, setAuthorQuery] = useState('');
  const [debouncedAuthorQuery, setDebouncedAuthorQuery] = useState('');
  const [authorOptions, setAuthorOptions] = useState<Option[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<Option[]>([]);
  const [showAuthorAdd, setShowAuthorAdd] = useState(false);
  const [newAuthor, setNewAuthor] = useState({ name: '', bio: '' });
  const [authorOpen, setAuthorOpen] = useState(false);
  const toast = useToast();

  const genres = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction',
    'Fantasy', 'Biography', 'History', 'Self-Help', 'Business',
    'Classic Literature', 'Dystopian Fiction', 'Coming-of-age',
    'Thriller', 'Horror', 'Poetry', 'Drama', 'Adventure'
  ];

  const stockImages = [
    'https://images.pexels.com/photos/1130980/pexels-photo-1130980.jpeg',
    'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg',
    'https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg',
    'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg',
    'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg'
  ];

  // Prefill when editing
  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title,
        genre: book.genre,
        coverImageUrl: book.coverImageUrl,
        totalCopies: (book as any).totalCopies ?? (book as any).copiesTotal ?? 1,
        publishedYear: book.publishedYear,
        rating: book.rating,
        reviewCount: book.reviewCount,
      });
      // best-effort preselects if available
      const pId = (book as any).publisherId;
      const pName = (book as any).publisherName;
      if (pId || pName) setSelectedPublisher({ id: pId ?? 0, name: pName ?? 'Publisher' });
      const bookAuthors: any[] = (book as any).authors || [];
      if (Array.isArray(bookAuthors)) {
        setSelectedAuthors(bookAuthors.map(a => ({ id: a.id ?? a.authorId ?? 0, name: a.name ?? a.authorName ?? '' })));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        title: '',
        genre: '',
        coverImageUrl: stockImages[0],
        totalCopies: 1,
        publishedYear: new Date().getFullYear(),
        rating: 0,
        reviewCount: 0,
      }));
      setSelectedPublisher(null);
      setSelectedAuthors([]);
    }
    setErrors({});
    setPublisherQuery('');
    setAuthorQuery('');
    setShowPublisherAdd(false);
    setShowAuthorAdd(false);
    setPublisherOpen(false);
    setAuthorOpen(false);
  }, [book, isOpen]);

  // Debounce queries
  useEffect(() => {
    const t = setTimeout(() => setDebouncedPublisherQuery(publisherQuery), 250);
    return () => clearTimeout(t);
  }, [publisherQuery]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAuthorQuery(authorQuery), 250);
    return () => clearTimeout(t);
  }, [authorQuery]);

  // Fetch options
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await API.listPublishers(debouncedPublisherQuery || undefined);
        if (active) setPublisherOptions((list || []).map((p: any) => ({ id: p.id, name: p.name })));
      } catch { /* noop */ }
    })();
    return () => { active = false; };
  }, [debouncedPublisherQuery]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await API.listAuthors(debouncedAuthorQuery || undefined);
        if (active) setAuthorOptions((list || []).map((a: any) => ({ id: a.id, name: a.name })));
      } catch { /* noop */ }
    })();
    return () => { active = false; };
  }, [debouncedAuthorQuery]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.genre) newErrors.genre = 'Genre is required';
    if (!selectedPublisher) newErrors.publisher = 'Publisher is required';
    if (formData.totalCopies < 1) newErrors.totalCopies = 'Total copies must be at least 1';
    if (formData.publishedYear < 1000 || formData.publishedYear > new Date().getFullYear()) {
      newErrors.publishedYear = 'Please enter a valid publication year';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      let savedBook;
      if (book) {
        throw new Error('Book update not implemented yet');
      } else {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const effStaffId = staffId || currentUser.id || 2;

        const authorIds = selectedAuthors.filter(a => !!a.id).map(a => a.id);
        const payload: any = {
          staffId: Number(effStaffId),
          title: formData.title,
          genre: formData.genre,
          copiesTotal: Number(formData.totalCopies),
          publishedYear: formData.publishedYear ? Number(formData.publishedYear) : undefined,
          coverImageUrl: formData.coverImageUrl || undefined,
        };
        if (selectedPublisher?.id) payload.publisherId = Number(selectedPublisher.id);
        else if (selectedPublisher?.name) payload.publisherName = selectedPublisher.name;
        if (authorIds.length) payload.authorIds = authorIds;

        savedBook = await API.createBook(payload);
      }
      onSave(savedBook);
      onClose();
    } catch (error: any) {
      let errorMessage = 'Something went wrong while saving the book.';
      if (error?.response?.data?.error) errorMessage = `Server Error: ${error.response.data.error}`;
      else if (error instanceof Error) errorMessage = error.message;
      alert(`Failed to save book: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const addAuthorToSelection = (author: Option) => {
    setSelectedAuthors(prev => (prev.find(a => a.id === author.id) ? prev : [...prev, author]));
  };
  const removeSelectedAuthor = (id: number) => setSelectedAuthors(prev => prev.filter(a => a.id !== id));

  const handleCreatePublisher = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!newPublisher.name.trim()) return;
    try {
      const created = await API.createPublisher({ name: newPublisher.name.trim(), address: newPublisher.address || undefined });
      const opt = { id: created.id, name: created.name } as Option;
      setSelectedPublisher(opt);
      setPublisherOptions(prev => [opt, ...prev]);
      setShowPublisherAdd(false);
      setNewPublisher({ name: '', address: '' });
      setPublisherQuery('');
      toast.show('Publisher created', 'success');
    } catch {
      toast.show('Failed to create publisher', 'error');
    }
  };

  const handleCreateAuthor = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!newAuthor.name.trim()) return;
    try {
      const created = await API.createAuthor({ name: newAuthor.name.trim(), bio: newAuthor.bio || undefined });
      const opt = { id: created.id, name: created.name } as Option;
      addAuthorToSelection(opt);
      setAuthorOptions(prev => [opt, ...prev]);
      setShowAuthorAdd(false);
      setNewAuthor({ name: '', bio: '' });
      setAuthorQuery('');
      toast.show('Author created', 'success');
    } catch {
      toast.show('Failed to create author', 'error');
    }
  };

  // Note: deletion of publishers/authors is disabled to avoid breaking references.

  if (!isOpen) return null;

  return (
    <>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Publication Year *</label>
                        <input
                          type="number"
                          value={formData.publishedYear}
                          onChange={(e) => handleInputChange('publishedYear', parseInt(e.target.value))}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.publishedYear ? 'border-red-300' : 'border-gray-300'}`}
                          min={1000}
                          max={new Date().getFullYear()}
                        />
                        {errors.publishedYear && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" /> {errors.publishedYear}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Publisher searchable select */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Publisher *</label>
                      <div className="relative">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                            <Search className="h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={selectedPublisher ? selectedPublisher.name : publisherQuery}
                              onChange={(e) => {
                                setSelectedPublisher(null);
                                setPublisherQuery(e.target.value);
                                if (errors.publisher) setErrors(prev => ({ ...prev, publisher: '' }));
                              }}
                              onFocus={() => setPublisherOpen(true)}
                              onClick={() => setPublisherOpen(true)}
                              onBlur={() => setTimeout(() => setPublisherOpen(false), 150)}
                              placeholder="Search publisher..."
                              className="w-full outline-none"
                            />
                            {selectedPublisher && (
                              <button type="button" onClick={() => setSelectedPublisher(null)} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        {publisherOpen && (
                          <div
                            className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-auto"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {publisherOptions.length > 0 ? (
                              publisherOptions.map(opt => (
                                <div key={opt.id} className="px-3 py-2 hover:bg-gray-50">
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedPublisher(opt); setPublisherQuery(''); setPublisherOpen(false); }}
                                    className="w-full text-left"
                                  >
                                    {opt.name}
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-gray-600">No results</div>
                            )}
                            {publisherQuery && (
                              <button
                                type="button"
                                onClick={() => { setShowPublisherAdd(true); setNewPublisher({ name: publisherQuery, address: '' }); setPublisherOpen(false); }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-blue-700"
                              >
                                <Plus className="h-4 w-4" /> Add new "{publisherQuery}"
                              </button>
                            )}
                          </div>
                        )}
                        {errors.publisher && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" /> {errors.publisher}
                          </p>
                        )}
                      </div>

                      {/* Inline add-new publisher form */}
                      {showPublisherAdd && (
                        <div className="mt-2 rounded-lg border border-gray-200 p-3 space-y-2 bg-white" role="group" aria-label="Add publisher">
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={newPublisher.name}
                              onChange={(e) => setNewPublisher(p => ({ ...p, name: e.target.value }))}
                              placeholder="Publisher name"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                              type="text"
                              value={newPublisher.address}
                              onChange={(e) => setNewPublisher(p => ({ ...p, address: e.target.value }))}
                              placeholder="Address (optional)"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setShowPublisherAdd(false)} className="px-3 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                            <button type="button" onClick={handleCreatePublisher} className="px-3 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800">Create & Select</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Authors multi-select */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Authors</label>
                      <div className="relative">
                        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 min-h-[44px]">
                          <Search className="h-4 w-4 text-gray-400" />
                          {selectedAuthors.map(a => (
                            <span key={a.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-800 rounded-full text-sm">
                              {a.name}
                              <button
                                type="button"
                                className="text-blue-600 hover:text-blue-800"
                                onClick={(e) => { e.preventDefault(); removeSelectedAuthor(a.id); }}
                                aria-label={`Remove ${a.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                          <input
                            type="text"
                            value={authorQuery}
                            onChange={(e) => setAuthorQuery(e.target.value)}
                            onFocus={() => setAuthorOpen(true)}
                            onClick={() => setAuthorOpen(true)}
                            onBlur={() => setTimeout(() => setAuthorOpen(false), 150)}
                            placeholder="Search authors..."
                            className="flex-1 min-w-[8rem] outline-none bg-transparent"
                          />
                        </div>
                        {authorOpen && (
                          <div
                            className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-auto"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {authorOptions.length > 0 ? (
                              authorOptions.map(opt => (
                                <div key={opt.id} className="px-3 py-2 hover:bg-gray-50">
                                  <button
                                    type="button"
                                    onClick={() => { addAuthorToSelection(opt); setAuthorQuery(''); setAuthorOpen(false); }}
                                    className="w-full text-left"
                                  >
                                    {opt.name}
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-gray-600">No results</div>
                            )}
                            {authorQuery && (
                              <button
                                type="button"
                                onClick={() => { setShowAuthorAdd(true); setNewAuthor({ name: authorQuery, bio: '' }); setAuthorOpen(false); }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-blue-700"
                              >
                                <Plus className="h-4 w-4" /> Add new "{authorQuery}"
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Inline add-new author form */}
                      {showAuthorAdd && (
                        <div className="mt-2 rounded-lg border border-gray-200 p-3 space-y-2 bg-white" role="group" aria-label="Add author">
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={newAuthor.name}
                              onChange={(e) => setNewAuthor(a => ({ ...a, name: e.target.value }))}
                              placeholder="Author name"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                              type="text"
                              value={newAuthor.bio}
                              onChange={(e) => setNewAuthor(a => ({ ...a, bio: e.target.value }))}
                              placeholder="Bio (optional)"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setShowAuthorAdd(false)} className="px-3 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                            <button type="button" onClick={handleCreateAuthor} className="px-3 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800">Create & Add</button>
                          </div>
                        </div>
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

    </>
  );
};

export default BookForm;
