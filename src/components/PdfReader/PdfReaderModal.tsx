import React, { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { Book, EpubBookmark } from '../../types';
import { epubStorage } from '../../services/epubStorage';
import { sounds } from '../../services/soundEffects';
import { DictionaryPanel } from '../Dictionary/DictionaryPanel';
import { PageFlip } from './PageFlip';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  FileText,
  Loader2,
  RotateCw,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Trash2,
  ExternalLink,
  List,
} from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfReaderModalProps {
  book: Book;
  onClose: () => void;
  onUpdateBook: (book: Book) => void;
}

const MAX_SCALE = 2.5;
const MIN_SCALE = 0.5;
const SCALE_STEP = 0.25;

export const PdfReaderModal: React.FC<PdfReaderModalProps> = ({ book, onClose, onUpdateBook }) => {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [basePageSize, setBasePageSize] = useState<{ width: number; height: number }>({
    width: 600,
    height: 800,
  });
  const [pageNumber, setPageNumber] = useState<number>(book.lastReadPdfPage || 1);
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState<boolean>(false);

  const [bookmarks, setBookmarks] = useState<EpubBookmark[]>([]);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState<boolean>(false);
  const [dictWord, setDictWord] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const stored = await epubStorage.getBookmarks(book.id);
        setBookmarks(stored);
      } catch {}
    })();
  }, [book.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!book.hasPdf) {
        setError('No PDF attached to this book.');
        setLoading(false);
        return;
      }
      try {
        const buf = await epubStorage.getPdfFile(book.id);
        if (cancelled) return;
        if (!buf) {
          setError('PDF file not found. It may have been removed.');
          setLoading(false);
          return;
        }
        setPdfData(buf);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError('Failed to load PDF from local storage.');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book.id, book.hasPdf]);

  const updateProgress = useCallback(
    (page: number) => {
      if (!numPages) return;
      const pct = Math.min(Math.round((page / numPages) * 100), 100);
      if (book.progressPages !== page) {
        onUpdateBook({
          ...book,
          progressPages: page,
          lastReadPdfPage: page,
          readingPercentage: pct,
          status: pct >= 100 ? 'completed' : book.status,
        });
      }
    },
    [book, numPages, onUpdateBook]
  );

  const goToPage = (page: number) => {
    if (page < 1 || page > numPages) return;
    setPageNumber(page);
    updateProgress(page);
    sounds.playPageFlip();
  };

  const handleLoadSuccess = ({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    const startPage = Math.min(book.lastReadPdfPage || 1, n);
    setPageNumber(startPage);
    updateProgress(startPage);
  };

  const toggleFullscreen = () => {
    const el = document.getElementById('pdf-reader-root');
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // --- BOOKMARKS ---
  const isCurrentPageBookmarked = bookmarks.some((b) => b.cfi === `page:${pageNumber}`);

  const handleToggleBookmark = async () => {
    if (isCurrentPageBookmarked) {
      const match = bookmarks.find((b) => b.cfi === `page:${pageNumber}`);
      if (match) {
        await epubStorage.deleteBookmark(match.id);
      }
    } else {
      sounds.playScanSuccess();
      const pct = numPages ? Math.min(Math.round((pageNumber / numPages) * 100), 100) : 0;
      const newBm: EpubBookmark = {
        id: `pbm-${Date.now()}`,
        cfi: `page:${pageNumber}`,
        label: `Page ${pageNumber}${numPages ? ` of ${numPages}` : ''}`,
        percentage: pct,
        chapterTitle: `Page ${pageNumber}`,
        createdAt: new Date().toISOString(),
      };
      await epubStorage.saveBookmark(book.id, newBm);
    }
    try {
      setBookmarks(await epubStorage.getBookmarks(book.id));
    } catch {}
  };

  const handleJumpToBookmark = (cfi: string) => {
    const pageNum = parseInt(cfi.replace(/^page:/, ''), 10);
    if (!Number.isNaN(pageNum)) {
      goToPage(pageNum);
      setIsBookmarksOpen(false);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    await epubStorage.deleteBookmark(id);
    try {
      setBookmarks(await epubStorage.getBookmarks(book.id));
    } catch {}
  };

  // --- DICTIONARY: pick up text selection ---
  const openDictionary = () => {
    let word: string | undefined;
    try {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';
      if (text && text.split(/\s+/).length <= 3) word = text.substring(0, 80);
    } catch {}
    if (word) setDictWord(word);
    setIsDictionaryOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') goToPage(pageNumber + 1);
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') goToPage(pageNumber - 1);
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      id="pdf-reader-root"
      className="fixed inset-0 z-50 flex flex-col bg-[#ECE7DE] text-[#2C2C2C]"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#F5F2ED] border-b border-[#D9D1C2] shadow-sm flex-wrap gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9] transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif font-bold text-sm sm:text-base text-[#2C2C2C] truncate max-w-[40vw] sm:max-w-xs">
              {book.title}
            </h2>
            <p className="text-[11px] text-[#8C867A] truncate">
              {book.pdfFileName || 'PDF Document'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))}
            className="p-2 rounded-lg text-[#5A5A40] hover:bg-[#EAE4D9] transition cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-[#5A5A40] w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))}
            className="p-2 rounded-lg text-[#5A5A40] hover:bg-[#EAE4D9] transition cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 rounded-lg text-[#5A5A40] hover:bg-[#EAE4D9] transition cursor-pointer"
            title="Rotate"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-[#5A5A40] hover:bg-[#EAE4D9] transition cursor-pointer"
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleBookmark}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
              isCurrentPageBookmarked
                ? 'bg-rose-100 text-rose-600'
                : 'text-[#5A5A40] hover:bg-[#EAE4D9]'
            }`}
            title={isCurrentPageBookmarked ? 'Remove bookmark from this page' : 'Bookmark this page'}
          >
            {isCurrentPageBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            <span className="text-xs font-semibold hidden sm:inline">
              {bookmarks.length > 0 ? `Bookmarks (${bookmarks.length})` : 'Bookmark'}
            </span>
          </button>
          <button
            onClick={() => setIsBookmarksOpen(true)}
            className="p-2 rounded-lg text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9] transition cursor-pointer"
            title="View bookmarks"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDictionary()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#5A5A40] hover:bg-[#EAE4D9] transition cursor-pointer"
            title="Open dictionary"
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-semibold hidden sm:inline">Dictionary</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto flex flex-col items-center p-4 sm:p-6 bg-[#ECE7DE] relative">
        {error && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-8">
            <AlertTriangle className="w-10 h-10 text-rose-500" />
            <p className="text-sm text-[#3D3A35] font-medium">{error}</p>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-[#5A5A40] text-white text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-[#5A5A40]">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">Loading PDF...</p>
          </div>
        )}

        {!loading && !error && pdfData && (
          <div
            className="relative drop-shadow-2xl"
            style={{
              width: basePageSize.width * scale,
              height: basePageSize.height * scale,
            }}
          >
            <Document
              file={pdfData}
              onLoadSuccess={handleLoadSuccess}
              onLoadError={() => setError('This PDF could not be rendered.')}
            >
              <Page
                pageNumber={pageNumber}
                width={basePageSize.width * scale}
                rotate={rotation}
                renderTextLayer={scale >= 0.8}
                renderAnnotationLayer={true}
                className="[&_canvas]:rounded-md bg-white"
                onLoadSuccess={(p) =>
                  setBasePageSize({
                    width: p.originalWidth,
                    height: p.originalHeight,
                  })
                }
              />
            </Document>
            <PageFlip
              width={basePageSize.width * scale}
              height={basePageSize.height * scale}
              canFlipNext={pageNumber < numPages}
              onFlipNext={() => goToPage(pageNumber + 1)}
              currentPage={
                <Document file={pdfData}>
                  <Page
                    pageNumber={pageNumber}
                    width={basePageSize.width * scale}
                    rotate={rotation}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="[&_canvas]:rounded-md bg-white"
                  />
                </Document>
              }
              nextPage={
                pageNumber < numPages ? (
                  <Document file={pdfData}>
                    <Page
                      pageNumber={pageNumber + 1}
                      width={basePageSize.width * scale}
                      rotate={rotation}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="[&_canvas]:rounded-md bg-white"
                    />
                  </Document>
                ) : null
              }
            />
          </div>
        )}
      </div>

      {/* Bottom Nav Bar */}
      {!loading && !error && numPages > 0 && (
        <div className="flex items-center justify-center gap-3 px-4 py-3 bg-[#F5F2ED] border-t border-[#D9D1C2]">
          <button
            onClick={() => goToPage(pageNumber - 1)}
            disabled={pageNumber <= 1}
            className="px-4 py-2 rounded-xl bg-[#EAE4D9] hover:bg-[#D9D1C2] text-[#5A5A40] disabled:opacity-40 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-[#3D3A35] whitespace-nowrap">
            Page {pageNumber} / {numPages}
          </span>
          <button
            onClick={() => goToPage(pageNumber + 1)}
            disabled={pageNumber >= numPages}
            className="px-4 py-2 rounded-xl bg-[#EAE4D9] hover:bg-[#D9D1C2] text-[#5A5A40] disabled:opacity-40 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bookmarks Drawer */}
      {isBookmarksOpen && (
        <div
          className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsBookmarksOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#F9F7F2] border-l border-[#D9D1C2] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 text-[#3D3A35]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#EAE4D9] bg-[#F5F2ED]">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#5A5A40]" />
                <h3 className="font-serif font-bold text-sm text-[#2C2C2C]">
                  Bookmarks ({bookmarks.length})
                </h3>
              </div>
              <button
                onClick={() => setIsBookmarksOpen(false)}
                className="p-2 rounded-full text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {bookmarks.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2 text-[#8C867A]">
                  <Bookmark className="w-8 h-8 mx-auto text-[#D9D1C2]" />
                  <p className="text-sm font-medium text-[#2C2C2C]">No bookmarks yet</p>
                  <p className="text-xs">
                    Tap the bookmark icon on the top bar to save the current page.
                  </p>
                </div>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="bg-[#FFFFFF] rounded-2xl border border-[#D9D1C2] p-3 shadow-sm flex items-center justify-between gap-3 group"
                  >
                    <div
                      onClick={() => handleJumpToBookmark(bm.cfi)}
                      className="flex-1 cursor-pointer truncate"
                    >
                      <p className="text-xs font-semibold text-[#2C2C2C] truncate">
                        {bm.label || bm.chapterTitle || 'Saved Page'}
                      </p>
                      <p className="text-[10px] text-[#8C867A] mt-0.5">
                        {Math.round(bm.percentage)}% of book •{' '}
                        {new Date(bm.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleJumpToBookmark(bm.cfi)}
                        className="p-1.5 text-[#5A5A40] hover:bg-[#EAE4D9] rounded-lg transition"
                        title="Jump to bookmark"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteBookmark(bm.id)}
                        className="p-1.5 text-[#8C867A] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete bookmark"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dictionary Panel */}
      <DictionaryPanel
        bookId={book.id}
        isOpen={isDictionaryOpen}
        onClose={() => setIsDictionaryOpen(false)}
        initialWord={dictWord}
      />
    </div>
  );
};
