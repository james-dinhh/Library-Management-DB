import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Login from "./components/Login";
import Register from "./components/Register"; 
import BookSearch from "./components/BookSearch";
import UserProfile from "./components/UserProfile";
import StaffDashboard from "./components/StaffDashboard";
import { User, Book, BorrowRecord } from "./types";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("search");
  const [authMode, setAuthMode] = useState<"login" | "register">("login"); 

  const [books, setBooks] = useState<Book[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);

  // Fetch books from backend
  useEffect(() => {
    const API_BASE = "http://localhost:4000";

    const fetchBooks = async () => {
      try {
        const res = await fetch(`${API_BASE}/books`);
        if (!res.ok) throw new Error("Failed to fetch books");
        const data = await res.json();

        const mappedBooks: Book[] = data.map((b: any) => ({
          id: b.id,
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
        }));

        setBooks(mappedBooks);
      } catch (err) {
        console.error("❌ Error fetching books:", err);
      }
    };

    fetchBooks();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab("search");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("search");
    setAuthMode("login"); 
  };

  const handleBorrow = async (book: Book) => {
    if (!currentUser || book.copiesAvailable <= 0) return;

    const API_BASE = "http://localhost:4000";

    try {
      const res = await fetch(`${API_BASE}/library/borrow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          bookId: book.id,
          days: 14,
        }),
      });

      if (!res.ok) throw new Error("Failed to borrow book");
      const data = await res.json();
      console.log("Borrowed book checkout ID:", data.checkoutId);

      const newRecord: BorrowRecord = {
        id: `br${Date.now()}`,
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
    const API_BASE = "http://localhost:4000";

    try {
      const res = await fetch(`${API_BASE}/library/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId }),
      });

      if (!res.ok) throw new Error("Failed to return book");
      console.log("Book returned successfully");
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
        return <UserProfile currentUser={currentUser} onReturn={handleReturn} />;
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
