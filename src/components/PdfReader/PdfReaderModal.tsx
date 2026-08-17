import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { Book, EpubBookmark, PdfHighlight, HighlightColor } from '../../types';
import { epubStorage } from '../../services/epubStorage';
import { sounds } from '../../services/soundEffects';
import { DictionaryPanel } from '../Dictionary/DictionaryPanel';
import { vocabStorage, VocabWord } from '../../services/vocabStorage';
import { VocabDrawer } from '../Dictionary/VocabDrawer';
import { PageFlip } from './PageFlip';
import {
  X,
  ArrowLeft,
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
  GraduationCap,
} from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const HIGHLIGHT_COLORS: { color: HighlightColor; label: string; bg: string }[] = [
  { color: 'yellow', label: 'Yellow', bg: 'rgba(255, 235, 59, 0.4)' },
  { color: 'green', label: 'Green', bg: 'rgba(76, 175, 80, 0.4)' },
  { color: 'blue', label: 'Blue', bg: 'rgba(33, 150, 243, 0.4)' },
  { color: 'pink', label: 'Pink', bg: 'rgba(244, 67, 54, 0.4)' },
  { color: 'purple', label: 'Purple', bg: 'rgba(171, 71, 188, 0.4)' },
];

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [basePageSize, setBasePageSize] = useState<{ width: number; height: number }>({
    width: 600,
    height: 800,
  });
  const [pageNumber, setPageNumber] = useState<number>(book.lastReadPdfPage || 1);
  const [scale, setScale] = useState<number>(1);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [pdfHighlights, setPdfHighlights] = useState<PdfHighlight[]>([]);
  const [pdfHighlightMenu, setPdfHighlightMenu] = useState<{
    x: number;
    y: number;
    text: string;
    pageNumber: number;
  } | null>(null);

  useEffect(() => {
    if (!pdfData) {
      setPdfUrl(null);
      return;
    }
    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdfData]);

  const [bookmarks, setBookmarks] = useState<EpubBookmark[]>([]);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState<boolean>(false);
  const [isVocabOpen, setIsVocabOpen] = useState<boolean>(false);
  const [dictWord, setDictWord] = useState<string>('');
  const [vocabWords, setVocabWords] = useState<VocabWord[]>(vocabStorage.getAll());

  useEffect(() => {
    (async () => {
      try {
        const stored = await epubStorage.getBookmarks(book.id);
        setBookmarks(stored);
      } catch {}
    })();
  }, [book.id]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await epubStorage.getPdfHighlights(book.id);
        setPdfHighlights(stored);
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

  const handlePdfSelectHighlight = async (color: HighlightColor) => {
    if (!pdfHighlightMenu) return;
    const newHighlight: PdfHighlight = {
      id: `phl-${Date.now()}`,
      pageNumber: pdfHighlightMenu.pageNumber,
      text: pdfHighlightMenu.text,
      color,
      createdAt: new Date().toISOString(),
    };
    await epubStorage.savePdfHighlight(book.id, newHighlight);
    setPdfHighlights((prev) => [...prev, newHighlight]);
    setPdfHighlightMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleDeletePdfHighlight = async (id: string) => {
    await epubStorage.deletePdfHighlight(id);
    setPdfHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = -e.deltaY * 0.005;
      setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(s * (1 + delta)).toFixed(2))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;

    let pinchDist = 0;
    let pinchScale = 1;
    let lastTap = 0;
    let touchCount = 0;

    const getDist = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const onTouchStart = (e: TouchEvent) => {
      touchCount = e.touches.length;
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchDist = getDist(e.touches[0], e.touches[1]);
        pinchScale = scaleRef.current;
      } else if (e.touches.length === 1) {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
          lastTap = 0;
          return;
        }
        const now = Date.now();
        if (now - lastTap < 300) {
          const newScale = scaleRef.current >= 1.5 ? 1 : 2;
          setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale)));
          lastTap = 0;
        } else {
          lastTap = now;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchDist > 0) {
        e.preventDefault();
        const dist = getDist(e.touches[0], e.touches[1]);
        const ratio = dist / pinchDist;
        setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(pinchScale * ratio).toFixed(2))));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchDist = 0;
      if (e.touches.length === 0) touchCount = 0;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;

    let selectionTimer: ReturnType<typeof setTimeout> | null = null;
    let lastSelectionText = '';

    const checkSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setPdfHighlightMenu(null);
        lastSelectionText = '';
        return;
      }
      const text = sel.toString().trim();
      if (!text || text.length < 2 || text.length > 500) {
        setPdfHighlightMenu(null);
        lastSelectionText = '';
        return;
      }
      const range = sel.getRangeAt(0);
      if (!range || !el.contains(range.commonAncestorContainer)) {
        setPdfHighlightMenu(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const containerRect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setPdfHighlightMenu(null);
        return;
      }
      setPdfHighlightMenu({
        x: rect.left + rect.width / 2 - containerRect.left + el.scrollLeft,
        y: rect.top - containerRect.top + el.scrollTop - 8,
        text,
        pageNumber,
      });
      lastSelectionText = text;
    };

    const handleSelectionChange = () => {
      if (selectionTimer) clearTimeout(selectionTimer);
      selectionTimer = setTimeout(checkSelection, 300);
    };

    const handleTouchEnd = () => {
      if (selectionTimer) clearTimeout(selectionTimer);
      selectionTimer = setTimeout(checkSelection, 50);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest('[data-highlight-menu]')) return;
      if ((e.target as HTMLElement)?.closest('[data-highlight-color]')) return;
      setPdfHighlightMenu(null);
      lastSelectionText = '';
      if (selectionTimer) {
        clearTimeout(selectionTimer);
        selectionTimer = null;
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('pointerdown', handlePointerDown);
    return () => {
      if (selectionTimer) clearTimeout(selectionTimer);
      document.removeEventListener('selectionchange', handleSelectionChange);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [pageNumber]);

  useEffect(() => {
    const pageHighlights = pdfHighlights.filter((h) => h.pageNumber === pageNumber);
    if (pageHighlights.length === 0) return;

    const colorMap: Record<string, string> = {
      yellow: 'rgba(255, 235, 59, 0.4)',
      green: 'rgba(76, 175, 80, 0.4)',
      blue: 'rgba(33, 150, 243, 0.4)',
      pink: 'rgba(244, 67, 54, 0.4)',
      purple: 'rgba(171, 71, 188, 0.4)',
    };

    const timer = setTimeout(() => {
      const textLayers = viewerRef.current?.querySelectorAll(
        '.react-pdf__Page__textContent, [data-page-number] .textLayer, .textLayer'
      );
      if (!textLayers) return;

      const strip = (s: string) => s.replace(/\s+/g, ' ').trim();

      pageHighlights.forEach((hl) => {
        const normalizedHL = strip(hl.text);
        if (normalizedHL.length < 2) return;

        textLayers.forEach((layer) => {
          const fullText = strip(layer.textContent || '');
          const matchIdx = fullText.indexOf(normalizedHL);
          if (matchIdx === -1) return;

          const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
          let charCount = 0;
          let startNode: Text | null = null;
          let startOffset = 0;
          let endNode: Text | null = null;
          let endOffset = 0;

          let node: Text | null;
          while ((node = walker.nextNode() as Text | null)) {
            const nodeLen = (node.textContent || '').length;
            if (!startNode && charCount + nodeLen > matchIdx) {
              startNode = node;
              startOffset = matchIdx - charCount;
            }
            if (charCount + nodeLen >= matchIdx + normalizedHL.length) {
              endNode = node;
              endOffset = matchIdx + normalizedHL.length - charCount;
              break;
            }
            charCount += nodeLen;
          }

          if (!startNode || !endNode) return;

          try {
            const range = document.createRange();
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);

            const span = document.createElement('span');
            span.style.backgroundColor = colorMap[hl.color] || 'rgba(255, 235, 59, 0.4)';
            span.style.borderRadius = '2px';
            span.setAttribute('data-hl-id', hl.id);
            range.surroundContents(span);
          } catch {}
        });
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      viewerRef.current?.querySelectorAll('[data-hl-id]').forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        }
        parent?.normalize();
      });
    };
  }, [pdfHighlights, pageNumber]);

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
      <div className="flex items-center justify-between px-3 md:px-6 py-2.5 bg-[#F5F2ED] border-b border-[#D9D1C2] shadow-sm flex-wrap gap-2">
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
            <h2 className="font-serif font-bold text-sm md:text-base text-[#2C2C2C] truncate max-w-[35vw] md:max-w-xs">
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
            <span className="text-xs font-semibold hidden md:inline">
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
            <span className="hidden md:inline text-xs font-medium">Dictionary</span>
          </button>
          <button
            onClick={() => setIsVocabOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#5A5A40] hover:bg-[#EAE4D9] transition cursor-pointer"
            title="Vocabulary book"
          >
            <GraduationCap className="w-4 h-4" />
            <span className="hidden md:inline text-xs font-medium">Vocab</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div ref={viewerRef} className="flex-1 overflow-auto flex flex-col items-center p-4 sm:p-6 bg-[#ECE7DE] relative">
        {/* Dictionary Panel (absolute top overlay) */}
        <DictionaryPanel
          isOpen={isDictionaryOpen}
          onClose={() => {
            setIsDictionaryOpen(false);
            setDictWord('');
          }}
          initialWord={dictWord}
          sourceBookTitle={book.title}
          onAddToVocab={(word, translation, phonetic, partOfSpeech) => {
            const next = vocabStorage.add(word, translation, book.title, phonetic, partOfSpeech);
            setVocabWords(next);
          }}
          vocabWords={new Set(vocabWords.map((v) => v.word.toLowerCase()))}
        />

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

        {!loading && !error && pdfUrl && (
          <div
            className="relative drop-shadow-2xl"
            style={{
              width: basePageSize.width * scale,
              height: basePageSize.height * scale,
              touchAction: 'manipulation',
            }}
          >
            <PageFlip
              width={basePageSize.width * scale}
              height={basePageSize.height * scale}
              canFlipNext={pageNumber < numPages}
              canFlipPrev={pageNumber > 1}
              onFlipNext={() => goToPage(pageNumber + 1)}
              onFlipPrev={() => goToPage(pageNumber - 1)}
              currentPageInteractive={
              <Document
                file={pdfUrl}
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
              }
              currentPage={
              <Document file={pdfUrl}>
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
              previousPage={
                pageNumber > 1 ? (
                  <Document file={pdfUrl}>
                    <Page
                      pageNumber={pageNumber - 1}
                      width={basePageSize.width * scale}
                      rotate={rotation}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="[&_canvas]:rounded-md bg-white"
                    />
                  </Document>
                ) : null
              }
              nextPage={
                pageNumber < numPages ? (
                  <Document file={pdfUrl}>
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

        {pdfHighlightMenu && (
          <div
            data-highlight-menu
            className="absolute z-50 bg-white rounded-xl shadow-lg border border-[#D9D1C2] p-2 flex gap-1.5"
            style={{
              left: Math.max(8, Math.min(pdfHighlightMenu.x - 100, (viewerRef.current?.clientWidth || 400) - 220)),
              top: Math.max(8, pdfHighlightMenu.y - 52),
            }}
          >
            {HIGHLIGHT_COLORS.map(({ color, label, bg }) => (
              <button
                key={color}
                data-highlight-color
                onClick={() => handlePdfSelectHighlight(color)}
                className="w-9 h-9 md:w-7 md:h-7 rounded-full transition hover:scale-110 cursor-pointer border border-black/10"
                style={{ backgroundColor: bg }}
                title={label}
              />
            ))}
            <button
              onClick={() => {
                navigator.clipboard.writeText(pdfHighlightMenu.text);
                setPdfHighlightMenu(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="px-2 py-1 text-xs text-[#5A5A40] hover:bg-[#EAE4D9] rounded-lg transition cursor-pointer"
              title="Copy text"
            >
              Copy
            </button>
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

      {/* Vocabulary Drawer */}
      <VocabDrawer
        isOpen={isVocabOpen}
        onClose={() => setIsVocabOpen(false)}
        words={vocabWords}
        onRefresh={() => setVocabWords(vocabStorage.getAll())}
      />
    </div>
  );
};
