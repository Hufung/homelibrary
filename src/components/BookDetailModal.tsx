import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Book, ReadingStatus, BookNote } from '../types';
import { Book3D } from './Book3D';
import { sounds } from '../services/soundEffects';
import {
  X,
  Star,
  BookOpen,
  CheckCircle2,
  Clock,
  Bookmark,
  Share2,
  Trash2,
  Plus,
  Heart,
  Quote,
  Layers,
  RotateCcw,
  Sparkles,
  UserCheck,
  UserX,
  ExternalLink,
  Edit3,
  ImageUp,
} from 'lucide-react';

interface BookDetailModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBook: (updatedBook: Book) => void;
  onDeleteBook: (bookId: string) => void;
  allShelves: string[];
  onOpenEpubReader: (book: Book) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  isOpen,
  onClose,
  onUpdateBook,
  onDeleteBook,
  allShelves,
  onOpenEpubReader,
}) => {
  if (!isOpen || !book) return null;

  const [activeTab, setActiveTab] = useState<'3d-inspector' | 'notes' | 'details'>('3d-inspector');
  const [isOpenCover, setIsOpenCover] = useState(false);
  const [rotation, setRotation] = useState({ x: 5, y: -25, z: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Please choose an image under 5 MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateBook({ ...book, coverUrl: reader.result });
        setIsOpenCover(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Note form state
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNotePage, setNewNotePage] = useState<number | ''>('');
  const [newQuote, setNewQuote] = useState('');

  // Lending modal state
  const [lendingName, setLendingName] = useState('');
  const [showLendingForm, setShowLendingForm] = useState(false);

  // Drag to rotate 3D Book logic
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;

    setRotation((prev) => ({
      x: Math.max(-80, Math.min(80, prev.x - deltaY * 0.6)),
      y: (prev.y + deltaX * 0.6) % 360,
      z: prev.z,
    }));

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Progress change handler
  const handleProgressChange = (newPages: number) => {
    const clamped = Math.max(0, Math.min(newPages, book.pageCount));
    const wasCompleted = book.status === 'completed';
    const isNowCompleted = clamped === book.pageCount;

    let newStatus: ReadingStatus = book.status;
    if (isNowCompleted && !wasCompleted) {
      newStatus = 'completed';
      sounds.playCelebration();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#6366f1'],
      });
    } else if (clamped > 0 && clamped < book.pageCount) {
      newStatus = 'reading';
    }

    onUpdateBook({
      ...book,
      progressPages: clamped,
      status: newStatus,
    });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    const newNote: BookNote = {
      id: `note_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      content: newNoteContent.trim(),
      page: typeof newNotePage === 'number' ? newNotePage : undefined,
    };

    onUpdateBook({
      ...book,
      notes: [newNote, ...book.notes],
    });

    setNewNoteContent('');
    setNewNotePage('');
  };

  const handleAddQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuote.trim()) return;

    onUpdateBook({
      ...book,
      quotes: [...book.quotes, newQuote.trim()],
    });

    setNewQuote('');
  };

  const handleLendBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lendingName.trim()) return;

    onUpdateBook({
      ...book,
      lentTo: {
        name: lendingName.trim(),
        date: new Date().toISOString().split('T')[0],
      },
    });

    setShowLendingForm(false);
    setLendingName('');
  };

  const handleReturnBook = () => {
    onUpdateBook({
      ...book,
      lentTo: null,
    });
  };

  const progressPercent = book.pageCount > 0
    ? Math.min(Math.round((book.progressPages / book.pageCount) * 100), 100)
    : 0;

  return (
    <div
      id="book-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-[#F9F7F2] border border-[#D9D1C2] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-[#3D3A35]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE4D9] bg-[#F5F2ED]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#EAE4D9] text-[#5A5A40] border border-[#D9D1C2]">
              {book.shelf || 'Unshelved'}
            </span>
            <span className="text-xs text-[#8C867A] font-mono">
              ISBN: {book.isbn}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(book.hasEpub || book.hasPdf) && (
              <button
                id="detail-read-epub-btn"
                onClick={() => {
                  onClose();
                  onOpenEpubReader(book);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5A5A40] hover:bg-[#4A4A34] text-white text-xs font-semibold rounded-full shadow-xs transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{book.hasPdf ? 'Read PDF' : 'Read Online (EPUB)'}</span>
              </button>
            )}

            <button
              id="detail-fav-btn"
              onClick={() => onUpdateBook({ ...book, isFavorite: !book.isFavorite })}
              className={`p-2 rounded-full border transition cursor-pointer ${
                book.isFavorite
                  ? 'bg-[#7D5A50]/15 text-[#7D5A50] border-[#7D5A50]/30'
                  : 'text-[#8C867A] hover:text-[#2C2C2C] border-transparent hover:bg-[#EAE4D9]'
              }`}
              title={book.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
            >
              <Heart className={`w-4 h-4 ${book.isFavorite ? 'fill-[#7D5A50]' : ''}`} />
            </button>

            <button
              id="detail-close-btn"
              onClick={onClose}
              className="p-2 rounded-full text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#EAE4D9] bg-[#F5F2ED]/60 px-6 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('3d-inspector')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === '3d-inspector'
                ? 'border-[#5A5A40] text-[#5A5A40]'
                : 'border-transparent text-[#8C867A] hover:text-[#2C2C2C]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            3D Book Model & Inspector
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'notes'
                ? 'border-[#5A5A40] text-[#5A5A40]'
                : 'border-transparent text-[#8C867A] hover:text-[#2C2C2C]'
            }`}
          >
            <Quote className="w-4 h-4" />
            Quotes & Notes ({book.notes.length + book.quotes.length})
          </button>

          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'details'
                ? 'border-[#5A5A40] text-[#5A5A40]'
                : 'border-transparent text-[#8C867A] hover:text-[#2C2C2C]'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Metadata & Shelf Settings
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F9F7F2]">
          {/* TAB 1: 3D INTERACTIVE INSPECTOR */}
          {activeTab === '3d-inspector' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* 3D Drag & Rotate Stage */}
                <div
                  id="3d-stage-container"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="md:col-span-7 bg-[#F5F2ED] rounded-3xl p-8 border border-[#D9D1C2] flex flex-col items-center justify-center min-h-[380px] relative select-none cursor-grab active:cursor-grabbing overflow-hidden shadow-sm"
                >
                  {/* Stage Lighting Hint */}
                  <div className="absolute top-4 left-4 text-[10px] text-[#8C867A] font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4A5D4A] animate-pulse" />
                    Drag to rotate 360° | {Math.round(rotation.y)}° Yaw
                  </div>

                  {/* 3D Model Instance */}
                  <div className="my-6">
                    <Book3D
                      book={book}
                      size="xl"
                      interactive={false}
                      isOpen={isOpenCover}
                      manualRotation={rotation}
                    />
                  </div>

                  {/* 3D Stage Controls Bar */}
                  <div className="flex items-center gap-2 mt-4 z-20">
                    <button
                      id="toggle-cover-btn"
                      onClick={() => {
                        sounds.playPageFlip();
                        setIsOpenCover(!isOpenCover);
                      }}
                      className="px-4 py-2 rounded-full text-xs font-medium bg-[#EAE4D9] hover:bg-[#D9D1C2] text-[#3D3A35] flex items-center gap-1.5 transition cursor-pointer border border-[#D9D1C2]"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#5A5A40]" />
                      {isOpenCover ? 'Close Book Cover' : 'Open Inside Cover'}
                    </button>

                    <button
                      onClick={() => setRotation({ x: 5, y: -25, z: 0 })}
                      className="p-2 rounded-full bg-[#EAE4D9] hover:bg-[#D9D1C2] text-[#8C867A] hover:text-[#2C2C2C] transition cursor-pointer border border-[#D9D1C2]"
                      title="Reset 3D Rotation"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverUpload}
                    />

                    <button
                      onClick={() => coverInputRef.current?.click()}
                      className="px-3 py-2 rounded-full text-xs font-medium bg-[#5A5A40] hover:bg-[#4a4a33] text-white transition cursor-pointer flex items-center gap-1.5"
                      title="Upload a cover image for this book"
                    >
                      <ImageUp className="w-3.5 h-3.5" />
                      Upload Cover
                    </button>

                    <button
                      onClick={() => setRotation((prev) => ({ ...prev, y: prev.y + 90 }))}
                      className="px-3.5 py-2 rounded-full text-xs font-medium bg-[#EAE4D9] hover:bg-[#D9D1C2] text-[#3D3A35] transition cursor-pointer border border-[#D9D1C2]"
                    >
                      Turn 90°
                    </button>
                  </div>
                </div>

                {/* Right Column: Reading Progress, Rating, Lending Tracker */}
                <div className="md:col-span-5 space-y-5">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#2C2C2C] leading-snug">
                      {book.title}
                    </h3>
                    <p className="text-sm text-[#8C867A] mt-1 font-medium">
                      by {book.authors.join(', ')}
                    </p>
                  </div>

                  {/* Star Rating Selector */}
                  <div className="bg-[#F5F2ED] p-4 rounded-2xl border border-[#D9D1C2] space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#8C867A]">
                      <span className="font-semibold text-[#2C2C2C]">My Rating</span>
                      <span className="text-[#B58D3D] font-bold">{book.rating || 0} / 5</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          id={`rate-star-${star}`}
                          onClick={() => {
                            sounds.playScanSuccess();
                            onUpdateBook({ ...book, rating: star });
                          }}
                          className="p-1 text-[#D9D1C2] hover:text-[#B58D3D] transition transform hover:scale-125 cursor-pointer"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= book.rating
                                ? 'fill-[#B58D3D] text-[#B58D3D]'
                                : 'text-[#D9D1C2]'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reading Status & Progress Slider */}
                  <div className="bg-[#F5F2ED] p-4 rounded-2xl border border-[#D9D1C2] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#2C2C2C]">Reading Progress</span>
                      <span className="text-xs font-mono font-bold text-[#5A5A40]">
                        {book.progressPages} / {book.pageCount} p. ({progressPercent}%)
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max={book.pageCount}
                      value={book.progressPages}
                      onChange={(e) => handleProgressChange(Number(e.target.value))}
                      className="w-full accent-[#5A5A40] cursor-pointer h-2 bg-[#D9D1C2] rounded-lg"
                    />

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {(['to-read', 'reading', 'completed'] as ReadingStatus[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => {
                            const newPages = st === 'completed' ? book.pageCount : st === 'to-read' ? 0 : book.progressPages || 1;
                            handleProgressChange(newPages);
                            onUpdateBook({ ...book, status: st, progressPages: newPages });
                          }}
                          className={`py-1.5 text-xs font-semibold rounded-full border capitalize transition cursor-pointer ${
                            book.status === st
                              ? 'bg-[#5A5A40] border-[#5A5A40] text-white'
                              : 'bg-[#FFFFFF] border-[#D9D1C2] text-[#8C867A] hover:text-[#2C2C2C]'
                          }`}
                        >
                          {st.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lending Tracker */}
                  <div className="bg-[#F5F2ED] p-4 rounded-2xl border border-[#D9D1C2] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#2C2C2C] flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-[#5A5A40]" />
                        Lending Status
                      </span>

                      {book.lentTo && (
                        <button
                          onClick={handleReturnBook}
                          className="text-[11px] text-[#4A5D4A] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          Mark as Returned
                        </button>
                      )}
                    </div>

                    {book.lentTo ? (
                      <div className="p-2.5 rounded-xl bg-[#EAE4D9] border border-[#D9D1C2] text-xs text-[#5A5A40] flex items-center justify-between">
                        <div>
                          <p className="font-semibold">Lent to {book.lentTo.name}</p>
                          <p className="text-[10px] text-[#8C867A]">On {book.lentTo.date}</p>
                        </div>
                      </div>
                    ) : showLendingForm ? (
                      <form onSubmit={handleLendBook} className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Friend's Name..."
                          value={lendingName}
                          onChange={(e) => setLendingName(e.target.value)}
                          className="flex-1 bg-[#FFFFFF] border border-[#D9D1C2] rounded-xl px-3 py-1.5 text-xs text-[#2C2C2C] outline-none"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-[#5A5A40] text-white text-xs font-semibold rounded-full cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowLendingForm(false)}
                          className="px-2.5 py-1.5 text-[#8C867A] hover:text-[#2C2C2C] text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setShowLendingForm(true)}
                        className="text-xs text-[#8C867A] hover:text-[#5A5A40] transition flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        Lend this book to a friend...
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QUOTES & PERSONAL NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Add Quote Form */}
              <div className="bg-[#F5F2ED] p-4 rounded-2xl border border-[#D9D1C2] space-y-3">
                <h4 className="text-xs font-semibold text-[#5A5A40] flex items-center gap-1.5">
                  <Quote className="w-3.5 h-3.5 text-[#5A5A40]" />
                  Add Memorable Quote
                </h4>
                <form onSubmit={handleAddQuote} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. You do not rise to the level of your goals..."
                    value={newQuote}
                    onChange={(e) => setNewQuote(e.target.value)}
                    className="flex-1 bg-[#FFFFFF] border border-[#D9D1C2] rounded-xl px-3.5 py-2 text-xs text-[#2C2C2C] placeholder:text-[#A69F92] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newQuote.trim()}
                    className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4A4A34] disabled:opacity-50 text-white font-semibold text-xs rounded-full cursor-pointer transition shadow-sm"
                  >
                    Add Quote
                  </button>
                </form>
              </div>

              {/* Quotes List */}
              {book.quotes.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-[#8C867A]">Saved Quotes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {book.quotes.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#D9D1C2] text-xs text-[#3D3A35] italic font-serif leading-relaxed relative group shadow-sm"
                      >
                        "{q}"
                        <button
                          onClick={() => {
                            const updated = book.quotes.filter((_, i) => i !== idx);
                            onUpdateBook({ ...book, quotes: updated });
                          }}
                          className="absolute top-2 right-2 text-[#A69F92] hover:text-[#7D5A50] opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Note Form */}
              <div className="bg-[#F5F2ED] p-4 rounded-2xl border border-[#D9D1C2] space-y-3">
                <h4 className="text-xs font-semibold text-[#5A5A40] flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-[#5A5A40]" />
                  Add Reading Note or Key Takeaway
                </h4>
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Write your reflection, summary, or thoughts..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D9D1C2] rounded-xl p-3 text-xs text-[#2C2C2C] placeholder:text-[#A69F92] outline-none"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="number"
                      placeholder="Page # (optional)"
                      value={newNotePage}
                      onChange={(e) => setNewNotePage(e.target.value ? Number(e.target.value) : '')}
                      className="w-32 bg-[#FFFFFF] border border-[#D9D1C2] rounded-xl px-3 py-1.5 text-xs text-[#2C2C2C] placeholder:text-[#A69F92] outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newNoteContent.trim()}
                      className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4A4A34] disabled:opacity-50 text-white font-semibold text-xs rounded-full cursor-pointer transition shadow-sm"
                    >
                      Save Note
                    </button>
                  </div>
                </form>
              </div>

              {/* Notes Timeline */}
              {book.notes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[#8C867A]">Notes Log</h4>
                  <div className="space-y-2.5">
                    {book.notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#D9D1C2] space-y-1 relative group shadow-sm"
                      >
                        <div className="flex items-center justify-between text-[11px] text-[#8C867A]">
                          <span className="font-mono">{note.date}</span>
                          {note.page && (
                            <span className="text-[#5A5A40] font-semibold">Page {note.page}</span>
                          )}
                        </div>
                        <p className="text-xs text-[#3D3A35] leading-relaxed">{note.content}</p>
                        <button
                          onClick={() => {
                            const updated = book.notes.filter((n) => n.id !== note.id);
                            onUpdateBook({ ...book, notes: updated });
                          }}
                          className="absolute top-3 right-3 text-[#A69F92] hover:text-[#7D5A50] opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: METADATA & SHELF SETTINGS */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#8C867A]">Book Title</label>
                  <input
                    type="text"
                    value={book.title}
                    onChange={(e) => onUpdateBook({ ...book, title: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#D9D1C2] rounded-xl p-2.5 text-xs text-[#2C2C2C] outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#8C867A]">Authors (comma separated)</label>
                  <input
                    type="text"
                    value={book.authors.join(', ')}
                    onChange={(e) =>
                      onUpdateBook({
                        ...book,
                        authors: e.target.value.split(',').map((a) => a.trim()),
                      })
                    }
                    className="w-full bg-[#FFFFFF] border border-[#D9D1C2] rounded-xl p-2.5 text-xs text-[#2C2C2C] outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#8C867A]">Shelf / Collection</label>
                  <select
                    value={book.shelf}
                    onChange={(e) => onUpdateBook({ ...book, shelf: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#D9D1C2] rounded-xl p-2.5 text-xs text-[#2C2C2C] outline-none"
                  >
                    {allShelves.map((sh) => (
                      <option key={sh} value={sh}>
                        {sh}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#8C867A]">Total Page Count</label>
                  <input
                    type="number"
                    value={book.pageCount}
                    onChange={(e) =>
                      onUpdateBook({ ...book, pageCount: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-full bg-[#FFFFFF] border border-[#D9D1C2] rounded-xl p-2.5 text-xs text-[#2C2C2C] outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#8C867A]">Publisher</label>
                  <input
                    type="text"
                    value={book.publisher}
                    onChange={(e) => onUpdateBook({ ...book, publisher: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#D9D1C2] rounded-xl p-2.5 text-xs text-[#2C2C2C] outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#8C867A]">Custom 3D Spine Color</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={book.spineColor || '#5A5A40'}
                      onChange={(e) => onUpdateBook({ ...book, spineColor: e.target.value })}
                      className="w-10 h-9 rounded-lg bg-[#FFFFFF] border border-[#D9D1C2] cursor-pointer p-0.5"
                    />
                    <span className="text-xs text-[#8C867A] font-mono">{book.spineColor}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#8C867A]">Book Description / Synopsis</label>
                <textarea
                  rows={4}
                  value={book.description}
                  onChange={(e) => onUpdateBook({ ...book, description: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#D9D1C2] rounded-xl p-3 text-xs text-[#2C2C2C] leading-relaxed outline-none"
                />
              </div>

              {/* Danger Zone: Delete Book */}
              <div className="pt-4 border-t border-[#EAE4D9] flex items-center justify-between">
                <a
                  href={`https://openlibrary.org/isbn/${book.isbn}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#5A5A40] hover:underline flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Registry on OpenLibrary
                </a>

                <button
                  id="delete-book-btn"
                  onClick={() => {
                    if (confirm(`Remove "${book.title}" from your bookshelf?`)) {
                      onDeleteBook(book.id);
                      onClose();
                    }
                  }}
                  className="px-4 py-2 rounded-full bg-[#7D5A50]/15 hover:bg-[#7D5A50]/25 text-[#7D5A50] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove from Bookshelf
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
