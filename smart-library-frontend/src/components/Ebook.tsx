import { useEffect, useState } from "react";
import type React from "react";
import API from "../services/api";
import { Calendar } from 'lucide-react';
import { ConfirmDialog } from "./ui/dialogs";

/** ============================
 *  Types
 *  ============================ */
interface Ebook {
  bookId: number;
  title: string;
  author: string;
  genre: string;
  publishedYear: number | null;
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
  onCancel: () => void;
}

interface SessionsListProps {
  userId: number;
}

/** Centralize via API client */

/** ============================
 *  Components
 *  ============================ */
function EbookList({ onSelectBook }: EbookListProps) {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
  const { items, total } = await API.listBooksForEbooksPaged({ page, pageSize });
        if (!cancelled) {
          setEbooks(items);
          setTotal(total);
        }
      } catch (e: any) {
        if (!cancelled) {
          // Axios error normalization
          const status = e?.response?.status;
          if (status === 401) setErr('Unauthorized. Please log in to view eBooks.');
          else setErr(e?.message || 'Failed to load eBooks');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, pageSize]);

  if (loading) return <div className="text-center py-8">Loading eBooks…</div>;
  if (err) return <div className="text-center py-8 text-red-600">{err}</div>;

  if (!ebooks.length) {
    return (
      <div className="text-center py-8 text-gray-600">
        No active books found. Add some in the Staff Dashboard, then refresh.
      </div>
    );
  }

  // Natural sort for eBook titles
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const sortedEbooks = [...ebooks].sort((a, b) => collator.compare(a.title, b.title));

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold">eBooks</h1>
      {/* Pagination controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          {(() => {
            const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
            const end = Math.min(total, page * pageSize);
            return `Showing ${start}-${end} of ${total}`;
          })()}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Rows per page:</label>
          <select
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            <option value={6}>6</option>
            <option value={12}>12</option>
            <option value={24}>24</option>
          </select>
          <div className="flex items-center gap-1 ml-4">
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <span className="mx-2 text-sm text-gray-700">Page {page} of {Math.max(1, Math.ceil(total / pageSize) || 1)}</span>
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage(p => (p * pageSize < total ? p + 1 : p))}
              disabled={page * pageSize >= total}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedEbooks.map((book) => (
          <div
            key={book.bookId}
            className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group h-full flex flex-col"
          >
            <div className="relative">
              <img
                src="/book.jpg"
                alt={book.title}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-medium text-white bg-indigo-600">
                eBook
              </div>
            </div>

            <div className="p-5 flex flex-col h-full">
              <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-700 transition-colors">
                {book.title}
              </h3>
              <p className="text-gray-600 text-sm mb-2">by {book.author}</p>

              <div className="flex items-center justify-between mb-4">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {book.genre}
                </span>
                <span className="text-xs text-gray-500 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {book.publishedYear ?? 'Unknown'}
                </span>
              </div>

              <button
                className="mt-auto w-full px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 text-sm font-medium"
                onClick={() => onSelectBook(book)}
              >
                Read
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Reader({ book, userId, onSessionEnd, onCancel }: ReaderProps) {
  const [startTime] = useState<Date>(new Date());
  const [pagesRead, setPagesRead] = useState<number[]>([]);
  const [highlights, setHighlights] = useState<{ page: number; text: string }[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [device] = useState<string>(window.navigator.userAgent);
  const [highlightText, setHighlightText] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [confirmEnd, setConfirmEnd] = useState<boolean>(false);
  const [confirmDiscard, setConfirmDiscard] = useState<boolean>(false);

  // Tick session timer
  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  function readPage() {
    // Advance the current page, and record it in pagesRead for stats
    setCurrentPage((prev) => {
      const next = prev + 1;
      setPagesRead((p) => [...p, next]);
      return next;
    });
  }

  function addHighlight() {
    const text = highlightText.trim();
    if (!text) return;
    // Attach to the current page (starts at 0 before any reading)
    const page = currentPage;
    setHighlights((prev) => [...prev, { page, text }]);
    setHighlightText("");
  }

  function removeHighlight(idx: number) {
    setHighlights(prev => prev.filter((_, i) => i !== idx));
  }

  function onHighlightKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addHighlight();
    }
  }

  function requestBack() {
    // If there's any progress, confirm discard; else go back immediately
    const hasProgress = pagesRead.length > 0 || highlights.length > 0 || elapsedSec >= 5;
    if (hasProgress) setConfirmDiscard(true);
    else onCancel();
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
        pages_read: pagesRead.length, 
        pagesRead, 
        highlights,
      };

  await API.createEbookSession(payload);

      onSessionEnd();
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) setErr('Unauthorized. Please log in again.');
      else setErr(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;

  return (
    <div className="max-w-3xl mx-auto grid gap-6 mt-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-1">Reading: {book.title}</h2>
        <div className="mb-4 text-gray-600">by {book.author}</div>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Time: <span className="ml-1 font-semibold">{mins}:{secs.toString().padStart(2,'0')}</span>
          </span>
          <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
            Current Page: <span className="ml-1 font-semibold">{currentPage}</span>
          </span>
          <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            Highlights: <span className="ml-1 font-semibold">{highlights.length}</span>
          </span>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <button
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition disabled:opacity-60"
            onClick={requestBack}
            disabled={submitting}
          >
            Back
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-60"
            onClick={readPage}
            disabled={submitting}
          >
            Read Next Page
          </button>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={highlightText}
              onChange={(e) => setHighlightText(e.target.value)}
              onKeyDown={onHighlightKeyDown}
              maxLength={200}
              placeholder="Add a highlight (press Enter to add)"
              className="border rounded px-3 py-2 flex-1"
              disabled={submitting}
            />
            <button
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition disabled:opacity-60"
              onClick={addHighlight}
              disabled={submitting || !highlightText.trim()}
            >
              Add Highlight
            </button>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-60"
            onClick={() => setConfirmEnd(true)}
            disabled={submitting}
          >
            End Session
          </button>
        </div>
        {err && <div className="text-red-600 mt-3">{err}</div>}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Highlights</h3>
          {highlights.length > 0 && (
            <span className="text-sm text-gray-500">{highlights.length} total</span>
          )}
        </div>
        {highlights.length === 0 ? (
          <div className="text-gray-500">No highlights yet. Add one above.</div>
        ) : (
          <ul className="divide-y">
            {highlights.map((h, i) => (
              <li key={i} className="py-2 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-500">Page {h.page}</div>
                  <div>{h.text}</div>
                </div>
                <button
                  className="text-sm text-red-600 hover:text-red-700"
                  onClick={() => removeHighlight(i)}
                  disabled={submitting}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmEnd}
        title="End Reading Session?"
        message={
          <div className="text-sm text-gray-700">
            <div className="mb-1"><strong>Book:</strong> {book.title}</div>
            <div className="mb-1"><strong>Duration:</strong> {mins} min {secs}s</div>
            <div className="mb-1"><strong>Pages read:</strong> {pagesRead.length} (last page {currentPage})</div>
            <div><strong>Highlights:</strong> {highlights.length}</div>
          </div>
        }
        confirmText="Save & End"
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => { setConfirmEnd(false); endSession(); }}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard Session?"
        message={
          <div className="text-sm text-gray-700">
            You have unsaved progress. If you go back now, this session will not be saved.
          </div>
        }
        confirmText="Discard"
        tone="danger"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => { setConfirmDiscard(false); onCancel(); }}
      />
    </div>
  );
}

function SessionsList({ userId }: SessionsListProps) {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const sessionsJson = await API.listEbookSessions(userId);
        if (!cancelled) setSessions(sessionsJson);
      } catch (e: any) {
        if (!cancelled) {
          const status = e?.response?.status;
          if (status === 401) setErr('Unauthorized. Please log in to view sessions.');
          else setErr(e.message || String(e));
        }
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
    if (s.book && s.book.title) return s.book.title;
    // Fallback to ID only
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
      <div className="text-gray-600 mt-6 text-center">
        You haven’t logged any reading sessions yet.<br />
        <span className="text-sm text-gray-400">Pick a book above to start your first session—your progress will appear here.</span>
      </div>
    );

  return (
    <div className="mt-8">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">Your Reading Sessions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions.map((s) => {
          const key =
            s._id ??
            `${String(s.startTime ?? "")}:${String(s.endTime ?? "")}:${s.bookId}`;
          const start = s.startTime ? new Date(s.startTime) : null;
          const end = s.endTime ? new Date(s.endTime) : null;
          const highlightsArray = Array.isArray(s.highlights) ? s.highlights : [];
          const isExpanded = expanded[key] ?? false;
          const previewCount = 3;
          const shownHighlights = isExpanded
            ? highlightsArray
            : highlightsArray.slice(0, previewCount);

          return (
            <div
              key={key}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 flex flex-col border border-gray-100"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-lg text-blue-800 truncate" title={sessionBookLabel(s)}>
                  {sessionBookLabel(s)}
                </span>
                <span className="ml-2 text-xs text-gray-500 whitespace-nowrap">
                  {start ? start.toLocaleDateString() : "?"}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                  Pages: <span className="ml-1 font-semibold">{sessionPagesCount(s)}</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200 text-xs font-medium">
                  Highlights: <span className="ml-1 font-semibold">{highlightsArray.length}</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 text-xs font-medium">
                  {start && end ? (
                    <>
                      {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </>
                  ) : (
                    "?"
                  )}
                </span>
              </div>
              <div className="mb-2 text-xs text-gray-400">
                {start && end ? (
                  <>
                    {start.toLocaleString()} – {end.toLocaleString()}
                  </>
                ) : null}
              </div>
              {highlightsArray.length > 0 && (
                <div className="mt-2">
                  <div className="text-sm font-semibold mb-1 text-gray-700">Highlights</div>
                  <ul className="list-disc pl-6 space-y-1">
                    {shownHighlights.map((h, i) => (
                      <li key={i} className="text-gray-800 text-sm">
                        <span className="font-medium text-blue-700">Page {h.page}:</span> {h.text}
                      </li>
                    ))}
                  </ul>
                  {highlightsArray.length > previewCount && (
                    <button
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline self-start"
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [key]: !isExpanded }))
                      }
                    >
                      {isExpanded
                        ? "Show less"
                        : `Show all ${highlightsArray.length}`}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EbooksApp({ userId }: { userId: number }) {
  const [selectedBook, setSelectedBook] = useState<Ebook | null>(null);
  const [activeTab, setActiveTab] = useState<'ebooks' | 'sessions'>('ebooks');

  function handleSessionEnd() {
    setSelectedBook(null);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-4">
        <div className="border-b border-gray-200 mt-4">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('ebooks')}
              className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'ebooks'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              eBooks
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'sessions'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reading Sessions
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'ebooks' ? (
        selectedBook ? (
          <Reader
            book={selectedBook}
            userId={userId}
            onSessionEnd={handleSessionEnd}
            onCancel={() => setSelectedBook(null)}
          />
        ) : (
          <EbookList onSelectBook={setSelectedBook} />
        )
      ) : (
        <SessionsList userId={userId} />
      )}
    </div>
  );
}
