import { useState, useEffect } from "react";
import Header from "./components/Header";
import Login from "./components/Login";
import Register from "./components/Register"; 
import BookSearch from "./components/BookSearch";
import UserProfile from "./components/UserProfile";
import StaffDashboard from "./components/StaffDashboard";
import EbooksApp from "./components/Ebook";
import { User, Book, BorrowRecord, Review } from "./types";
import { useToast } from "./components/ui/toast";
import API from "./services/api";

function App() {
  const { show } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Load last tab from localStorage or default to "search"
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("activeTab") || "search";
  });

  // Whenever activeTab changes, save it
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);
  const [authMode, setAuthMode] = useState<"login" | "register">("login"); 

  const [books, setBooks] = useState<Book[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);

  // Fetch books from backend (now via API client) and include reviews
  const fetchBooks = async () => {
    try {
      const { items } = await API.getBooksPaged({});
      const booksWithReviews = await Promise.all(
        (items || []).map(async (b: any) => {
          try {
            const reviews = await API.getBookReviews(Number(b.id));
            const author = Array.isArray((b as any).authors)
              ? (b as any).authors.join(', ')
              : (b as any).author ?? '';
            return { ...b, author, id: String(b.id), reviews } as Book;
          } catch {
            const author = Array.isArray((b as any).authors)
              ? (b as any).authors.join(', ')
              : (b as any).author ?? '';
            return { ...b, author, id: String(b.id), reviews: [] } as Book;
          }
        })
      );
      setBooks(booksWithReviews);
    } catch (err) {
      console.error("Failed to fetch books:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "search") {
      fetchBooks();
    }
  }, [activeTab]);


  // Fetch user's reviews from backend
  const fetchUserReviews = async (userId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const data = await API.getUserReviews(userId);
      const mappedReviews: Review[] = (data || []).map((review: any) => ({
        id: review.id,
        bookId: review.bookId,
        userId: String(review.userId ?? ''),
        userName: review.userName ?? '',
        rating: review.rating,
        comment: review.comment,
        date: review.date,
        bookTitle: review.title,
      }));
      setUserReviews(mappedReviews);
    } catch {}
  };

  // Check for existing login on app load
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      if (!token || currentUser) return;

      try {
        const me: any = await API.getCurrentUser();
        const u = (me && (me.user ?? me)) || {};
        const normalized: User = {
          ...u,
          id: String(u.id),
          membershipDate: u.registrationDate ?? u.membershipDate ?? '',
        } as User;
        setCurrentUser(normalized);
        fetchUserBorrowings(String(u.id));
        fetchUserReviews(String(u.id));
      } catch {
        // Token is invalid, remove it
        localStorage.removeItem('token');
      }
    };

    validateToken();
  }, [currentUser]);

  // Fetch user's borrowings from backend
  const fetchUserBorrowings = async (userId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const data = await API.listUserBorrowings(userId);
      const mappedRecords: BorrowRecord[] = (data || []).map((record: any) => ({
        id: `br${record.checkout_id}`,
        checkoutId: record.checkout_id,
        userId: String(record.user_id),
        bookId: String(record.book_id),
        borrowDate: record.borrow_date?.split('T')[0] || record.borrow_date,
        dueDate: record.due_date?.split('T')[0] || record.due_date,
        returnDate: record.return_date?.split('T')[0] || record.return_date,
        status: record.return_date ? 'returned' : 'borrowed',
        isLate: typeof record.is_late === 'number' ? record.is_late : record.is_late === null ? null : undefined,
      }));
      setBorrowRecords(mappedRecords);
    } catch {}
  };

  const handleLogin = (user: User) => {
    const normalizedUser = {
      ...user,
      id: String(user.id) // Ensure id is stored as string
    };
    setCurrentUser(normalizedUser);
    setActiveTab("search");
    // Fetch user's borrowings when they log in
    fetchUserBorrowings(String(user.id));
    fetchUserReviews(String(user.id));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setBorrowRecords([]); // Clear borrowings on logout
    setUserReviews([]); // Clear reviews on logout
    setActiveTab("search");
    setAuthMode("login"); 
  };

  const handleBorrow = async (book: Book) => {
    if (!currentUser || book.copiesAvailable <= 0) return;

    try {
      const data = await API.borrowLibrary({
        userId: Number(currentUser.id),
        bookId: Number(book.id),
        days: 14,
      });

      const newRecord: BorrowRecord = {
        id: `br${Date.now()}`,
        checkoutId: data.checkoutId, // Store the real database checkout ID
        userId: currentUser.id,
        bookId: book.id,
        borrowDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        status: "borrowed",
      };

      setBorrowRecords([...borrowRecords, newRecord]);
      setBooks(
        books.map((b) =>
          b.id === book.id
            ? { ...b, copiesAvailable: b.copiesAvailable - 1 }
            : b
        )
      );
      // Refetch books to update availability
      await fetchBooks();
      // Show success toast at top-center
      show(`Borrowed “${book.title}” successfully. Due in 14 days.`, 'success');
    } catch (err) {
      console.error(" Error borrowing book:", err);
      show('Could not borrow the book. Please try again.', 'error');
    }
  };

  const handleReturn = async (checkoutId: string) => {
    try {
      await API.returnLibrary(Number(checkoutId));

      // Update the UI state to reflect the returned book
      const checkoutIdNum = Number(checkoutId);
      // Find the returned record (before update)
      const returnedRecord = borrowRecords.find(record => record.checkoutId === checkoutIdNum);

      setBorrowRecords(borrowRecords.map(record =>
        record.checkoutId === checkoutIdNum
          ? { ...record, status: 'returned' as const, returnDate: new Date().toISOString().split("T")[0] }
          : record
      ));

      if (returnedRecord) {
        const returnedBook = books.find(b => b.id === returnedRecord.bookId);
        setBooks(books.map(book =>
          book.id === returnedRecord.bookId
            ? { ...book, copiesAvailable: book.copiesAvailable + 1 }
            : book
        ));
        // Refetch books to update availability
        await fetchBooks();
        // Use isLate if available
        if (returnedRecord.isLate === 1) {
          show(`Returned “${returnedBook?.title ?? 'book'}”. This book was overdue. Please return on time next time!`, 'info');
        } else if (returnedRecord.isLate === 0) {
          show(`Returned “${returnedBook?.title ?? 'book'}”. Thanks for returning on time!`, 'success');
        } else {
          // fallback to JS check if isLate is missing
          const now = new Date();
          const due = new Date(returnedRecord.dueDate);
          if (now > due) {
            show(`Returned “${returnedBook?.title ?? 'book'}”. This book was overdue. Please return on time next time!`, 'info');
          } else {
            show(`Returned “${returnedBook?.title ?? 'book'}”. Thanks for returning on time!`, 'success');
          }
        }
      }
    } catch (err) {
      show('Could not return the book. Please try again.', 'error');
    }
  };

  // If no user logged in, show login or register
  if (!currentUser) {
    return authMode === "login" ? (
      <Login onLogin={handleLogin} onSwitchToRegister={() => setAuthMode("register")} />
    ) : (
      <Register onRegister={handleLogin} onSwitchToLogin={() => setAuthMode("login")} />
    );
  }

  // If logged in, show app content
  const renderContent = () => {
    switch (activeTab) {
      case "search":
        return (
          <BookSearch
            books={books}
            currentUser={currentUser}
            onBorrow={handleBorrow}
          />
        );
      case "profile":
        return <UserProfile 
          currentUser={currentUser} 
          borrowRecords={borrowRecords}
          books={books}
          userReviews={userReviews}
          onReturn={handleReturn} 
        />;
      case "dashboard":
        return currentUser.role === "staff" ? (
          <StaffDashboard currentUser={currentUser} />
        ) : null;
      case "ebooks":
        return <EbooksApp userId={Number(currentUser?.id)} />;
      default:
        return (
          <BookSearch
            books={books}
            currentUser={currentUser}
            onBorrow={handleBorrow}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      {renderContent()}
    </div>
  );
}

export default App;
