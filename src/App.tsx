import React, { useState, useEffect, useMemo } from 'react';
import { Book, ViewMode, FilterOptions } from './types';
import { Navbar } from './components/Navbar';
import { Bookshelf3DView } from './components/Bookshelf3DView';
import { BookGridView } from './components/BookGridView';
import { ScannerModal } from './components/ScannerModal';
import { BookDetailModal } from './components/BookDetailModal';
import { StatsDrawer } from './components/StatsDrawer';
import { EpubReaderModal } from './components/EpubReader/EpubReaderModal';
import { EpubUploadModal } from './components/EpubReader/EpubUploadModal';
import { PdfReaderModal } from './components/PdfReader/PdfReaderModal';
import { sounds } from './services/soundEffects';
import { Sparkles, BookOpen, Layers, RefreshCw, Heart, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'bibliotheca_3d_books_v2';
const THEME_KEY = 'bibliotheca_3d_shelf_theme';

export default function App() {
  // Books collection state
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse error
    }
    return [];
  });

  // Shelf aesthetic theme
  const [shelfTheme, setShelfTheme] = useState<'wood' | 'modern'>(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_KEY);
      if (storedTheme === 'wood' || storedTheme === 'modern') return storedTheme;
    } catch {}
    return 'wood';
  });

  // Navigation & View state
  const [viewMode, setViewMode] = useState<ViewMode>('bookshelf-3d');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isEpubUploadOpen, setIsEpubUploadOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & Sorting state
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: 'all',
    shelf: 'all',
    sortBy: 'addedAt',
    sortDirection: 'desc',
    favoritesOnly: false,
    epubOnly: false,
  });

  // Save books to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } catch (err) {
      console.error('Failed to save to localStorage', err);
    }
  }, [books]);

  // Save shelf theme
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, shelfTheme);
    } catch {}
  }, [shelfTheme]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Derive unique shelves list
  const allShelves = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => {
      if (b.shelf) set.add(b.shelf);
    });
    return Array.from(set);
  }, [books]);

  // Filter and sort books
  const filteredBooks = useMemo(() => {
    return books
      .filter((book) => {
        // Search query
        if (filters.search.trim()) {
          const q = filters.search.toLowerCase();
          const matchTitle = book.title.toLowerCase().includes(q);
          const matchAuthor = book.authors.some((a) => a.toLowerCase().includes(q));
          const matchISBN = book.isbn.toLowerCase().includes(q);
          const matchCategory = book.categories.some((c) => c.toLowerCase().includes(q));
          const matchShelf = book.shelf.toLowerCase().includes(q);
          if (!matchTitle && !matchAuthor && !matchISBN && !matchCategory && !matchShelf) {
            return false;
          }
        }

        // Status
        if (filters.status !== 'all' && book.status !== filters.status) {
          return false;
        }

        // Shelf
        if (filters.shelf !== 'all' && book.shelf !== filters.shelf) {
          return false;
        }

        // Favorites
        if (filters.favoritesOnly && !book.isFavorite) {
          return false;
        }

        // eBooks / Attached files only
        if (filters.epubOnly && !book.hasEpub && !book.hasPdf) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (filters.sortBy === 'author') {
          return (a.authors[0] || '').localeCompare(b.authors[0] || '');
        }
        if (filters.sortBy === 'rating') {
          return b.rating - a.rating;
        }
        if (filters.sortBy === 'progress') {
          const aPct = a.pageCount > 0 ? a.progressPages / a.pageCount : 0;
          const bPct = b.pageCount > 0 ? b.progressPages / b.pageCount : 0;
          return bPct - aPct;
        }
        if (filters.sortBy === 'pageCount') {
          return b.pageCount - a.pageCount;
        }
        // Default: addedAt
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      });
  }, [books, filters]);

  // Book modification actions
  const handleAddBook = (newBook: Book) => {
    setBooks((prev) => [newBook, ...prev]);
    showToast(`Added "${newBook.title}" to ${newBook.shelf}!`);
  };

  const handleUpdateBook = (updatedBook: Book) => {
    setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)));
    if (selectedBook && selectedBook.id === updatedBook.id) {
      setSelectedBook(updatedBook);
    }
  };

  const handleDeleteBook = (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    if (selectedBook && selectedBook.id === bookId) {
      setSelectedBook(null);
    }
    showToast('Book removed from library.');
  };

  // Export JSON Backup
  const handleExportData = () => {
    const jsonStr = JSON.stringify(books, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-bookshelf-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Bookshelf backup exported!');
  };

  // Import JSON Backup
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setBooks(imported);
          showToast(`Successfully restored ${imported.length} books!`);
        }
      } catch {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearLibrary = () => {
    if (confirm('Clear all books? This cannot be undone.')) {
      setBooks([]);
      showToast('Library cleared.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#3D3A35] flex flex-col font-sans selection:bg-[#5A5A40]/20 selection:text-[#5A5A40]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#EAE4D9] border border-[#D9D1C2] text-[#5A5A40] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#5A5A40]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation & Controls */}
      <Navbar
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        filters={filters}
        onUpdateFilters={(f) => setFilters((prev) => ({ ...prev, ...f }))}
        allShelves={allShelves}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenEpubUpload={() => setIsEpubUploadOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onExportData={handleExportData}
        onImportData={handleImportData}
        totalBooksCount={books.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Active View Selection */}
        {viewMode === 'bookshelf-3d' ? (
          <Bookshelf3DView
            books={filteredBooks}
            onSelectBook={(b) => setSelectedBook(b)}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenEpubReader={(b) => setReadingBook(b)}
            shelfTheme={shelfTheme}
            onToggleTheme={() => setShelfTheme(shelfTheme === 'wood' ? 'modern' : 'wood')}
          />
        ) : (
          <BookGridView
            books={filteredBooks}
            onSelectBook={(b) => setSelectedBook(b)}
            onUpdateBook={handleUpdateBook}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenEpubReader={(b) => setReadingBook(b)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#EAE4D9] bg-[#F5F2ED] py-6 px-4 text-center text-xs text-[#8C867A]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-1.5">
            <span className="text-[#5A5A40] font-serif font-bold">Bibliotheca 3D</span>
            <span>• Personal 3D Bookshelf, ISBN Scanner & Digital EPUB Reader</span>
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={handleClearLibrary}
              className="text-[#8C867A] hover:text-rose-500 transition flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Clear Library
            </button>

            <span>•</span>
            <span>Offline-Ready IndexedDB EPUB Engine</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAddBook={handleAddBook}
        existingShelves={allShelves}
      />

      <BookDetailModal
        book={selectedBook}
        isOpen={Boolean(selectedBook)}
        onClose={() => setSelectedBook(null)}
        onUpdateBook={handleUpdateBook}
        onDeleteBook={handleDeleteBook}
        allShelves={allShelves}
        onOpenEpubReader={(b) => setReadingBook(b)}
      />

      <StatsDrawer
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        books={books}
      />

      {/* EPUB / PDF Reader Modal */}
      {readingBook && readingBook.hasEpub && !readingBook.hasPdf && (
        <EpubReaderModal
          book={readingBook}
          isOpen={Boolean(readingBook)}
          onClose={() => setReadingBook(null)}
          onUpdateBook={handleUpdateBook}
        />
      )}

      {readingBook && readingBook.hasPdf && (
        <PdfReaderModal
          book={readingBook}
          onClose={() => setReadingBook(null)}
          onUpdateBook={handleUpdateBook}
        />
      )}

      {/* EPUB Upload & Storage Modal */}
      <EpubUploadModal
        isOpen={isEpubUploadOpen}
        onClose={() => setIsEpubUploadOpen(false)}
        existingBooks={books}
        allShelves={allShelves}
        onAddBook={handleAddBook}
        onUpdateBook={handleUpdateBook}
        onOpenReader={(b) => setReadingBook(b)}
      />
    </div>
  );
}
