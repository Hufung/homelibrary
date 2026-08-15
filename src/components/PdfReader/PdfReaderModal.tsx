import React, { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { Book } from '../../types';
import { epubStorage } from '../../services/epubStorage';
import { sounds } from '../../services/soundEffects';
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
  const [pageNumber, setPageNumber] = useState<number>(book.lastReadPdfPage || 1);
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState<boolean>(false);

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
          <Document
            file={pdfData}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={() => setError('This PDF could not be rendered.')}
            className="drop-shadow-2xl"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              renderTextLayer={scale >= 0.8}
              renderAnnotationLayer={true}
              className="[&_canvas]:rounded-md bg-white"
            />
          </Document>
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
    </div>
  );
};
