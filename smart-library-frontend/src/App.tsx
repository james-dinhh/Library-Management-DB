import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Login from "./components/Login";
import BookSearch from "./components/BookSearch";
import UserProfile from "./components/UserProfile";
import StaffDashboard from "./components/StaffDashboard";
import { User, Book, BorrowRecord } from "./types";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("search");

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
        setBooks(data);
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
  };

  const handleBorrow = async (book: Book) => {
    if (!currentUser || book.copiesAvailable <= 0) return;

    const API_BASE = "http://localhost:4000";

    try {
      // Call backend
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

      // Update frontend state
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

      // 🔹 Temporary notification
      const notification = document.createElement("div");
      notification.className =
        "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300";
      notification.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Successfully borrowed "${book.title}"!</span>
        </div>
        <div class="text-sm mt-1">Due date: ${new Date(
          newRecord.dueDate
        ).toLocaleDateString()}</div>
      `;
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.opacity = "0";
        setTimeout(() => document.body.removeChild(notification), 300);
      }, 3000);
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

  if (!currentUser) return <Login onLogin={handleLogin} />;

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
        return <UserProfile currentUser={currentUser} />;
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