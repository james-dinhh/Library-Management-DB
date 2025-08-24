export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const calculateDaysUntilDue = (dueDate: string): number => {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const renderStars = (rating: number): string => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0));
};

export const getAvailabilityStatus = (availableCopies: number): {
  status: string;
  color: string;
} => {
  if (availableCopies > 3) {
    return { status: 'Available', color: 'text-green-600' };
  } else if (availableCopies > 0) {
    return { status: 'Limited', color: 'text-yellow-600' };
  } else {
    return { status: 'Unavailable', color: 'text-red-600' };
  }
};