import React, { useEffect, useState } from "react";

// --- Types ---
interface Ebook {
  bookId: number;
  title: string;
  author: string;
  genre: string;
  publishedYear: number;
}

interface ReadingSession {
  _id?: string;
  userId: number;
  bookId: number;
  startTime: string | Date;
  endTime: string | Date;
  device?: string;
  pagesRead?: number[];
  highlights?: { page: number; text: string }[];
}

interface EbookListProps {
  onSelectBook: (book: Ebook) => void;
}

interface ReaderProps {
  book: Ebook;
  userId: number;
  onSessionEnd: () => void;
}

interface SessionsListProps {
  userId: number;
}

interface EbooksAppProps {
  userId: number;
  userName: string;
}

// --- Components ---
function EbookList({ onSelectBook }: EbookListProps) {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("http://localhost:4001/ebooks/mongo-ebooks")
      .then(res => res.json())
      .then(setEbooks)
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="text-center py-8">Loading eBooks...</div>;
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">eBooks</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ebooks.map(book => (
          <div
            key={book.bookId}
            className="bg-white rounded-lg shadow p-4 flex flex-col justify-between"
          >
            <div>
              <div className="font-semibold text-lg">{book.title}</div>
              <div className="text-gray-600 mb-2">by {book.author}</div>
              <div className="text-sm text-gray-500">
                {book.genre}, {book.publishedYear}
              </div>
            </div>
            <button
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              onClick={() => onSelectBook(book)}
            >
              Read
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Reader({ book, userId, onSessionEnd }: ReaderProps) {
  const [startTime] = useState<Date>(new Date());
  const [pagesRead, setPagesRead] = useState<number[]>([]);
  const [highlights, setHighlights] = useState<{ page: number; text: string }[]>([]);
  const [device] = useState<string>(window.navigator.userAgent);
  const [highlightText, setHighlightText] = useState<string>("");

  function readPage() {
    setPagesRead([...pagesRead, pagesRead.length + 1]);
  }

  function addHighlight() {
    if (highlightText.trim()) {
      setHighlights([...highlights, { page: pagesRead.length, text: highlightText }]);
      setHighlightText("");
    }
  }

  function endSession() {
    fetch("http://localhost:4001/ebooks/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        bookId: book.bookId,
        startTime,
        endTime: new Date(),
        device,
        pagesRead,
        highlights,
      }),
    }).then(() => onSessionEnd());
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-6 mt-6">
      <h2 className="text-xl font-bold mb-2">Reading: {book.title}</h2>
      <div className="mb-4 text-gray-600">by {book.author}</div>
      <div className="flex gap-2 mb-4">
        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          onClick={readPage}
        >
          Read Next Page
        </button>
        <input
          type="text"
          value={highlightText}
          onChange={e => setHighlightText(e.target.value)}
          placeholder="Highlight text"
          className="border rounded px-2 py-1 flex-1"
        />
        <button
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
          onClick={addHighlight}
        >
          Add Highlight
        </button>
      </div>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition mb-4"
        onClick={endSession}
      >
        End Session
      </button>
      <div className="mb-2">Pages Read: <span className="font-semibold">{pagesRead.length}</span></div>
      <div>
        <div className="font-semibold mb-1">Highlights:</div>
        <ul className="list-disc pl-6">
          {highlights.map((h, i) => (
            <li key={i}>Page {h.page}: {h.text}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SessionsList({ userId }: SessionsListProps) {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  useEffect(() => {
    fetch("http://localhost:4001/ebooks/mongo-ebooks")
      .then(res => res.json())
      .then(setEbooks);
    fetch(`http://localhost:4001/ebooks/sessions/${userId}`)
      .then(res => res.json())
      .then(setSessions);
  }, [userId]);

  function getBookInfo(bookId: number) {
    const book = ebooks.find(b => b.bookId === bookId);
    return book ? `${book.title} by ${book.author}` : `Book ${bookId}`;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Your Reading Sessions</h2>
      <ul className="space-y-2">
        {sessions.map(s => (
          <li
            key={s._id}
            className="bg-gray-50 rounded p-3 shadow flex flex-col"
          >
            <div>
              <span className="font-semibold">{getBookInfo(s.bookId)}</span>
              <span className="ml-2 text-gray-600">
                {s.startTime ? new Date(s.startTime).toLocaleString() : "?"} - {s.endTime ? new Date(s.endTime).toLocaleString() : "?"}
              </span>
            </div>
            <div className="text-sm mt-1">
              Pages: {Array.isArray(s.pagesRead) ? s.pagesRead.length : (s.pages_read || 0)}, Highlights: {Array.isArray(s.highlights) ? s.highlights.length : 0}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface EbooksAppProps {
  userId: number;
}

export default function EbooksApp({ userId }: EbooksAppProps) {
  const [selectedBook, setSelectedBook] = useState<Ebook | null>(null);

  function handleSessionEnd() {
    setSelectedBook(null);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">eBooks App</h1>
      {!selectedBook ? (
        <>
          <EbookList onSelectBook={setSelectedBook} />
          <SessionsList userId={userId} />
        </>
      ) : (
        <Reader book={selectedBook!} userId={userId} onSessionEnd={handleSessionEnd} />
      )}
    </div>
  );
}