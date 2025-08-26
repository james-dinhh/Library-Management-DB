import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Login from "./components/Login";
import Register from "./components/Register"; 
import BookSearch from "./components/BookSearch";
import UserProfile from "./components/UserProfile";
import StaffDashboard from "./components/StaffDashboard";
import { User, Book, BorrowRecord, Review } from "./types";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("search");
  const [authMode, setAuthMode] = useState<"login" | "register">("login"); 

  const [books, setBooks] = useState<Book[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);

  // Fetch books from backend
  useEffect(() => {
    const API_BASE = "http://localhost:4001";

    const fetchBooks = async () => {
      try {
        const res = await fetch(`${API_BASE}/books`);
        if (!res.ok) throw new Error("Failed to fetch books");
        const data = await res.json();

        const booksWithReviews = await Promise.all(data.map(async (b: any) => {
          const token = localStorage.getItem('token');
          const headers: { [key: string]: string } = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          try {
            const reviewsRes = await fetch(`${API_BASE}/reviews/book/${b.id}`, { headers });
            const reviews = reviewsRes.ok ? await reviewsRes.json() : [];

            return {
              id: String(b.id),
              title: b.title,
              author: b.author || b.authors || "Unknown",
              coverImageUrl:
                b.coverImageUrl ||
                "https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg",
              publishedYear: b.publishedYear || "Unknown",
              genre: b.genre || b.category || "Unknown",
              isbn: b.isbn || "",
              rating: b.rating || 0,
              reviewCount: b.reviewCount || 0,
              copiesAvailable: b.copiesAvailable ?? 0,
              totalCopies: b.totalCopies ?? 0,
              description: b.description || "",
              reviews: reviews,
            };
          } catch (error) {
            console.error(`Failed to fetch reviews for book ${b.id}`, error);
            return { // Return book data even if reviews fail
              id: String(b.id),
              title: b.title,
              author: b.author || b.authors || "Unknown",
              coverImageUrl:
                b.coverImageUrl ||
                "https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg",
              publishedYear: b.publishedYear || "Unknown",
              genre: b.genre || b.category || "Unknown",
              isbn: b.isbn || "",
              rating: b.rating || 0,
              reviewCount: b.reviewCount || 0,
              copiesAvailable: b.copiesAvailable ?? 0,
              totalCopies: b.totalCopies ?? 0,
              description: b.description || "",
              reviews: [],
            };
          }
      }));

        setBooks(booksWithReviews);
      } catch (err) {
        console.error("❌ Error fetching books:", err);
      }
    };

    fetchBooks();
  }, []);

  // Fetch user's reviews from backend
  const fetchUserReviews = async (userId: string) => {
    const API_BASE = "http://localhost:4001";
    const token = localStorage.getItem('token');
    
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/reviews/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error("Failed to fetch reviews");
      const data = await res.json();

      const mappedReviews: Review[] = data.map((review: any) => ({
        id: review.id,
        bookId: review.bookId,
        rating: review.rating,
        comment: review.comment,
        date: review.date,
      }));

      setUserReviews(mappedReviews);
      console.log("✅ Fetched reviews:", mappedReviews.length, "reviews");
    } catch (err) {
      console.error("❌ Error fetching reviews:", err);
    }
  };

  // Check for existing login on app load
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      if (!token || currentUser) return;

      try {
        const API_BASE = "http://localhost:4001";
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          // Token is invalid, remove it
          localStorage.removeItem('token');
          return;
        }

        const data = await res.json();
        setCurrentUser({
          ...data.user,
          id: String(data.user.id) // Ensure id is stored as string
        });
        // Fetch user's borrowings after successful token validation
        fetchUserBorrowings(String(data.user.id));
        fetchUserReviews(String(data.user.id));
        console.log("✅ Token validated, user logged in automatically");
      } catch (err) {
        console.error("❌ Token validation failed:", err);
        localStorage.removeItem('token');
      }
    };

    validateToken();
  }, [currentUser]);

  // Fetch user's borrowings from backend
  const fetchUserBorrowings = async (userId: string) => {
    const API_BASE = "http://localhost:4001";
    const token = localStorage.getItem('token');
    
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/library/user/${userId}/borrowings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error("Failed to fetch borrowings");
      const data = await res.json();

      // Map database records to frontend BorrowRecord format
      const mappedRecords: BorrowRecord[] = data.map((record: any) => ({
        id: `br${record.checkout_id}`,
        checkoutId: record.checkout_id,
        userId: String(record.user_id),
        bookId: String(record.book_id), // Ensure consistent string type
        borrowDate: record.borrow_date?.split('T')[0] || record.borrow_date,
        dueDate: record.due_date?.split('T')[0] || record.due_date,
        status: record.return_date ? "returned" : "borrowed",
      }));

      setBorrowRecords(mappedRecords);
      console.log("✅ Fetched borrowings:", mappedRecords.length, "records");
    } catch (err) {
      console.error("❌ Error fetching borrowings:", err);
    }
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

    const API_BASE = "http://localhost:4001";
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE}/library/borrow`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: Number(currentUser.id),
          bookId: Number(book.id),
          days: 14,
        }),
      });

      if (!res.ok) throw new Error("Failed to borrow book");
      const data = await res.json();
      console.log("Borrowed book checkout ID:", data.checkoutId);

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
    } catch (err) {
      console.error("❌ Error borrowing book:", err);
    }
  };

  const handleReturn = async (checkoutId: string) => {
    const API_BASE = "http://localhost:4001";
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE}/library/return`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ checkoutId: Number(checkoutId) }),
      });

      if (!res.ok) throw new Error("Failed to return book");
      console.log("Book returned successfully");
      
      // Update the UI state to reflect the returned book
      const checkoutIdNum = Number(checkoutId);
      setBorrowRecords(borrowRecords.map(record => 
        record.checkoutId === checkoutIdNum 
          ? { ...record, status: 'returned' as const, returnDate: new Date().toISOString().split("T")[0] }
          : record
      ));
      
      // Find the book and increment available copies
      const returnedRecord = borrowRecords.find(record => record.checkoutId === checkoutIdNum);
      if (returnedRecord) {
        setBooks(books.map(book => 
          book.id === returnedRecord.bookId 
            ? { ...book, copiesAvailable: book.copiesAvailable + 1 }
            : book
        ));
      }
    } catch (err) {
      console.error("❌ Error returning book:", err);
    }
  };

  // 🔹 If no user logged in, show login or register
  if (!currentUser) {
    return authMode === "login" ? (
      <Login onLogin={handleLogin} onSwitchToRegister={() => setAuthMode("register")} />
    ) : (
      <Register onRegister={handleLogin} onSwitchToLogin={() => setAuthMode("login")} />
    );
  }

  // 🔹 If logged in, show app content
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
