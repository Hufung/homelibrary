import React, { useState, useRef } from 'react';
import { Book, ReadingStatus } from '../../types';
import { extractEpubMetadata, createSampleEpubBlob } from '../../services/epubParser';
import { epubStorage } from '../../services/epubStorage';
import { sounds } from '../../services/soundEffects';
import {
  Upload,
  BookOpen,
  FileText,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface EpubUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingBooks: Book[];
  allShelves: string[];
  onAddBook: (newBook: Book) => void;
  onUpdateBook: (book: Book) => void;
  onOpenReader: (book: Book) => void;
}

export const EpubUploadModal: React.FC<EpubUploadModalProps> = ({
  isOpen,
  onClose,
  existingBooks,
  allShelves,
  onAddBook,
  onUpdateBook,
  onOpenReader,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extracted preview state
  const [parsedData, setParsedData] = useState<{
    file: File | Blob;
    fileName: string;
    fileSize: number;
    title: string;
    authors: string[];
    description: string;
    coverUrl: string;
    publisher: string;
    language: string;
    pageEstimate: number;
  } | null>(null);

  // Assignment options
  const [mode, setMode] = useState<'new-book' | 'attach-existing'>('new-book');
  const [selectedShelf, setSelectedShelf] = useState<string>('General');
  const [selectedExistingBookId, setSelectedExistingBookId] = useState<string>(
    existingBooks[0]?.id || ''
  );

  if (!isOpen) return null;

  const handleFileProcess = async (file: File | Blob, customName?: string) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const meta = await extractEpubMetadata(buffer);

      const fileName = customName || (file instanceof File ? file.name : 'sample_book.epub');

      setParsedData({
        file,
        fileName,
        fileSize: buffer.byteLength,
        title: meta.title,
        authors: meta.authors,
        description: meta.description,
        coverUrl:
          meta.coverDataUrl ||
          `https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80`,
        publisher: meta.publisher || 'Independent EPUB',
        language: meta.language || 'en',
        pageEstimate: meta.spineItemCount,
      });

      sounds.playScanSuccess();
    } catch (err: any) {
      console.error('Error processing EPUB', err);
      setErrorMessage(
        'Could not parse this EPUB file. Please ensure it is a valid, unencrypted .epub file.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.epub') || file.type.includes('epub')) {
        handleFileProcess(file);
      } else {
        setErrorMessage('Please upload a file with .epub extension.');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  // Quick load built-in sample EPUB
  const handleLoadSample = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const blob = await createSampleEpubBlob();
      await handleFileProcess(blob, 'Meditations_Sample.epub');
    } catch (err) {
      setErrorMessage('Failed to generate sample book.');
      setIsProcessing(false);
    }
  };

  // Finalize saving & start reading
  const handleComplete = async (andReadImmediately = true) => {
    if (!parsedData) return;

    try {
      let targetBook: Book;

      if (mode === 'new-book') {
        const newBookId = `epub-${Date.now()}`;
        const newBook: Book = {
          id: newBookId,
          isbn: `EPUB-${Math.floor(100000 + Math.random() * 900000)}`,
          title: parsedData.title,
          authors: parsedData.authors,
          description: parsedData.description,
          coverUrl: parsedData.coverUrl,
          pageCount: parsedData.pageEstimate,
          publishedDate: new Date().getFullYear().toString(),
          publisher: parsedData.publisher,
          categories: ['EPUB Reader', 'E-Book'],
          language: parsedData.language,
          status: 'reading',
          rating: 5,
          progressPages: 0,
          shelf: selectedShelf,
          notes: [],
          quotes: [],
          addedAt: new Date().toISOString(),
          spineColor: '#5A5A40',
          accentColor: '#B58D3D',
          isFavorite: false,
          hasEpub: true,
          epubFileName: parsedData.fileName,
          epubFileSize: parsedData.fileSize,
        };

        // Save binary file into IndexedDB
        await epubStorage.saveEpubFile(newBookId, parsedData.file, parsedData.fileName);
        onAddBook(newBook);
        targetBook = newBook;
      } else {
        // Attach to existing book
        const existing = existingBooks.find((b) => b.id === selectedExistingBookId);
        if (!existing) return;

        const updated: Book = {
          ...existing,
          hasEpub: true,
          epubFileName: parsedData.fileName,
          epubFileSize: parsedData.fileSize,
        };

        await epubStorage.saveEpubFile(existing.id, parsedData.file, parsedData.fileName);
        onUpdateBook(updated);
        targetBook = updated;
      }

      onClose();

      if (andReadImmediately) {
        onOpenReader(targetBook);
      }
    } catch (err) {
      console.error('Failed to save EPUB to storage', err);
      setErrorMessage('Failed to save EPUB to local storage database.');
    }
  };

  return (
    <div
      id="epub-upload-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#F9F7F2] border border-[#D9D1C2] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-[#3D3A35] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE4D9] bg-[#F5F2ED]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#EAE4D9] border border-[#D9D1C2] flex items-center justify-center text-[#5A5A40]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#2C2C2C]">Upload & Read EPUB</h3>
              <p className="text-xs text-[#8C867A]">Store books offline & read in browser</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!parsedData ? (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center text-center transition cursor-pointer ${
                  isDragging
                    ? 'border-[#5A5A40] bg-[#5A5A40]/10 scale-[1.01]'
                    : 'border-[#D9D1C2] hover:border-[#8C867A] bg-[#FFFFFF]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".epub,application/epub+zip"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-full bg-[#F5F2ED] border border-[#D9D1C2] flex items-center justify-center text-[#5A5A40] mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>

                <p className="text-sm font-semibold text-[#2C2C2C]">
                  {isProcessing ? 'Analyzing EPUB contents...' : 'Click to browse or drop an .epub file here'}
                </p>

                <p className="text-xs text-[#8C867A] mt-1 max-w-sm">
                  Supports standard EPUB 2 and EPUB 3 formats. Files are stored securely in your browser's persistent database.
                </p>
              </div>

              {/* Sample Book Quick Try Button */}
              <div className="flex items-center justify-center pt-2">
                <button
                  onClick={handleLoadSample}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-[#EAE4D9] hover:bg-[#D9D1C2] text-[#5A5A40] border border-[#D9D1C2] flex items-center gap-2 transition cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Try Sample Book (Meditations & Philosophy of Reading)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Parsed EPUB Confirmation View */
            <div className="space-y-5">
              <div className="bg-[#FFFFFF] border border-[#D9D1C2] rounded-2xl p-4 flex gap-4 shadow-sm">
                <img
                  src={parsedData.coverUrl}
                  alt={parsedData.title}
                  className="w-20 h-28 object-cover rounded-xl shadow-md flex-shrink-0 border border-[#D9D1C2]"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAE4D9] text-[#5A5A40]">
                    EPUB E-Book
                  </span>
                  <h4 className="font-serif font-bold text-base text-[#2C2C2C] leading-snug line-clamp-2">
                    {parsedData.title}
                  </h4>
                  <p className="text-xs text-[#8C867A]">by {parsedData.authors.join(', ')}</p>
                  <p className="text-[11px] text-[#8C867A] pt-1">
                    ~{parsedData.pageEstimate} pages • {(parsedData.fileSize / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>

              {/* Storage Mode Selector */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-[#8C867A]">How to organize in library?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode('new-book')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      mode === 'new-book'
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                        : 'bg-[#FFFFFF] text-[#3D3A35] border-[#D9D1C2]'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Add as New Shelf Book
                    </div>
                    <div className="text-[11px] opacity-80 mt-1">
                      Places book on 3D shelf with 3D model
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('attach-existing')}
                    disabled={existingBooks.length === 0}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      mode === 'attach-existing'
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                        : 'bg-[#FFFFFF] text-[#3D3A35] border-[#D9D1C2] disabled:opacity-50'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> Attach to Existing Book
                    </div>
                    <div className="text-[11px] opacity-80 mt-1">
                      Link EPUB file to a book already on shelf
                    </div>
                  </button>
                </div>

                {mode === 'new-book' ? (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-[#8C867A]">Target Shelf</label>
                    <select
                      value={selectedShelf}
                      onChange={(e) => setSelectedShelf(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#D9D1C2] rounded-xl p-2.5 text-xs text-[#2C2C2C] outline-none"
                    >
                      {allShelves.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-[#8C867A]">Select Book to Link</label>
                    <select
                      value={selectedExistingBookId}
                      onChange={(e) => setSelectedExistingBookId(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#D9D1C2] rounded-xl p-2.5 text-xs text-[#2C2C2C] outline-none"
                    >
                      {existingBooks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title} (by {b.authors[0]})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#EAE4D9] flex items-center justify-between gap-3">
                <button
                  onClick={() => setParsedData(null)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-[#8C867A] hover:text-[#2C2C2C] transition cursor-pointer"
                >
                  Choose Different File
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleComplete(false)}
                    className="px-4 py-2 rounded-full text-xs font-medium bg-[#EAE4D9] hover:bg-[#D9D1C2] text-[#3D3A35] transition cursor-pointer border border-[#D9D1C2]"
                  >
                    Save Only
                  </button>

                  <button
                    onClick={() => handleComplete(true)}
                    className="px-5 py-2 rounded-full text-xs font-semibold bg-[#5A5A40] hover:bg-[#4A4A34] text-white transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Read Now</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
