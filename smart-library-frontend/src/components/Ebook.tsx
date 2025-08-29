import React, { useEffect, useState } from "react";

/** ============================
 *  Types
 *  ============================ */
interface Ebook {
  bookId: number;
  title: string;
  author: string;
  genre: string;
  publishedYear: number;
}

interface SessionBook {
  id: number;
  title: string;
  genre?: string;
  publishedYear?: number;
  status?: "active" | "retired";
}

interface ReadingSession {
  _id?: string;
  userId: number;
  bookId: number;
  startTime?: string | Date;
  endTime?: string | Date;
  device?: string;

  // Backend-friendly numeric count (preferred)
  pages_read?: number;

  // Legacy client-side array (kept for compatibility)
  pagesRead?: number[];

  highlights?: { page: number; text: string }[];

  // Hydrated by backend (when available)
  userName?: string | null;
  book?: SessionBook | null;
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

/** Centralize API base */
const API_BASE = "http://localhost:4001";

/** ============================
 *  Components
 *  ============================ */
function EbookList({ onSelectBook }: EbookListProps) {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // 🔄 Use MySQL-backed endpoint
    fetch(`${API_BASE}/ebooks/books`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load eBooks (${res.status})`);
        return res.json();
      })
      .then(setEbooks)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8">Loading eBooks…</div>;
  if (err) return <div className="text-center py-8 text-red-600">{err}</div>;

  if (!ebooks.length) {
    return (
      <div className="text-center py-8 text-gray-600">
        No active books found. Add some in the Staff Dashboard, then refresh.
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">eBooks</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ebooks.map((book) => (
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
  const [highlights, setHighlights] = useState<{ page: number; text: string }[]>(
    []
  );
  const [device] = useState<string>(window.navigator.userAgent);
  const [highlightText, setHighlightText] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function readPage() {
    setPagesRead((prev) => [...prev, prev.length + 1]); // ✅ fixed
  }

  function addHighlight() {
    const text = highlightText.trim();
    if (!text) return;
    // Tie highlight to the most recently "read" page index
    const page = Math.max(1, pagesRead.length);
    setHighlights((prev) => [...prev, { page, text }]); // ✅ fixed
    setHighlightText("");
  }

  async function endSession() {
    setSubmitting(true);
    setErr(null);
    try {
      const payload = {
        userId,
        bookId: book.bookId,
        startTime,
        endTime: new Date(),
        device,
        // ✅ send both forms for compatibility:
        pages_read: pagesRead.length, // backend-friendly numeric
        pagesRead, // legacy array
        highlights,
      };

      const res = await fetch(`${API_BASE}/ebooks/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to save session (${res.status}): ${text}`);
      }

      onSessionEnd();
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-6 mt-6">
      <h2 className="text-xl font-bold mb-2">Reading: {book.title}</h2>
      <div className="mb-4 text-gray-600">by {book.author}</div>

      <div className="flex gap-2 mb-4">
        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-60"
          onClick={readPage}
          disabled={submitting}
        >
          Read Next Page
        </button>

        <input
          type="text"
          value={highlightText}
          onChange={(e) => setHighlightText(e.target.value)}
          placeholder="Highlight text"
          className="border rounded px-2 py-1 flex-1"
          disabled={submitting}
        />
        <button
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition disabled:opacity-60"
          onClick={addHighlight}
          disabled={submitting}
        >
          Add Highlight
        </button>
      </div>

      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition mb-4 disabled:opacity-60"
        onClick={endSession}
        disabled={submitting}
      >
        {submitting ? "Saving..." : "End Session"}
      </button>

      {err && <div className="text-red-600 mb-2">{err}</div>}

      <div className="mb-2">
        Pages Read: <span className="font-semibold">{pagesRead.length}</span>
      </div>
      <div>
        <div className="font-semibold mb-1">Highlights:</div>
        <ul className="list-disc pl-6">
          {highlights.map((h, i) => (
            <li key={i}>
              Page {h.page}: {h.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SessionsList({ userId }: SessionsListProps) {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`${API_BASE}/ebooks/sessions/${userId}`);
        if (!res.ok) throw new Error(`sessions ${res.status}`);
        const sessionsJson = await res.json();
        if (!cancelled) setSessions(sessionsJson);
      } catch (e: any) {
        if (!cancelled) setErr(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  function sessionBookLabel(s: ReadingSession) {
    // Prefer hydrated book title if backend provided it
    if (s.book && s.book.title) return s.book.title;
    // Fallback to ID only (rare—only when book was deleted)
    return `Book ${s.bookId}`;
  }

  function sessionPagesCount(s: ReadingSession) {
    // Prefer the numeric field; otherwise count the legacy array if present
    return typeof s.pages_read === "number"
      ? s.pages_read
      : Array.isArray(s.pagesRead)
      ? s.pagesRead.length
      : 0;
  }

  if (loading) return <div className="py-6">Loading sessions…</div>;
  if (err) return <div className="text-red-600">{err}</div>;
  if (!sessions.length)
    return (
      <div className="text-gray-600 mt-6">
        No sessions yet for user {userId}. Try reading a book above, or ensure
        your sample document’s <code>userId</code> matches this value.
      </div>
    );

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Your Reading Sessions</h2>
      <ul className="space-y-2">
        {sessions.map((s) => {
          const key =
            s._id ??
            `${String(s.startTime ?? "")}:${String(s.endTime ?? "")}:${s.bookId}`;
          const start = s.startTime ? new Date(s.startTime) : null;
          const end = s.endTime ? new Date(s.endTime) : null;

          return (
            <li key={key} className="bg-gray-50 rounded p-3 shadow flex flex-col">
              <div>
                <span className="font-semibold">{sessionBookLabel(s)}</span>
                <span className="ml-2 text-gray-600">
                  {start ? start.toLocaleString() : "?"} –{" "}
                  {end ? end.toLocaleString() : "?"}
                </span>
              </div>
              <div className="text-sm mt-1">
                Pages: {sessionPagesCount(s)}, Highlights:{" "}
                {Array.isArray(s.highlights) ? s.highlights.length : 0}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function EbooksApp({ userId }: { userId: number }) {
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
        <Reader book={selectedBook} userId={userId} onSessionEnd={handleSessionEnd} />
      )}
    </div>
  );
}
