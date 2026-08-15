import React, { useState } from 'react';
import { Book } from '../types';
import { Book3D } from './Book3D';
import { Star, BookOpen, Clock, CheckCircle2, Bookmark, Heart, MoreVertical, Sparkles, UserCheck } from 'lucide-react';
import { sounds } from '../services/soundEffects';

interface BookGridViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onUpdateBook: (updatedBook: Book) => void;
  onOpenScanner: () => void;
  onOpenEpubReader?: (book: Book) => void;
}

export const BookGridView: React.FC<BookGridViewProps> = ({
  books,
  onSelectBook,
  onUpdateBook,
  onOpenScanner,
  onOpenEpubReader,
}) => {
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#F5F2ED] rounded-2xl border border-[#D9D1C2] shadow-sm my-8">
        <div className="w-16 h-16 rounded-full bg-[#EAE4D9] flex items-center justify-center text-[#5A5A40] mb-4 border border-[#D9D1C2]">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-serif font-bold text-[#2C2C2C] mb-2">No Matching Books Found</h3>
        <p className="text-[#8C867A] text-sm max-w-md mb-6">
          Try clearing your search filters or scan a new book ISBN to expand your bookshelf.
        </p>
        <button
          id="grid-empty-scan-btn"
          onClick={onOpenScanner}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#5A5A40] hover:bg-[#4A4A34] text-white font-medium rounded-full transition shadow-lg shadow-[#5A5A40]/20 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Scan Book ISBN
        </button>
      </div>
    );
  }

  return (
    <div id="book-grid-layout" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pt-4 pb-12">
      {books.map((book) => {
        const isOpen = openBookId === book.id;
        const progressPercent = book.pageCount > 0
          ? Math.min(Math.round((book.progressPages / book.pageCount) * 100), 100)
          : 0;

        return (
          <div
            key={book.id}
            id={`book-card-${book.id}`}
            className="group relative bg-[#F5F2ED] hover:bg-[#FFFFFF] border border-[#D9D1C2] hover:border-[#5A5A40]/40 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-[#5A5A40]/5"
          >
            {/* Top Bar with Shelf Tag & Favorite Toggle */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#EAE4D9] text-[#5A5A40] border border-[#D9D1C2] truncate max-w-[140px]">
                {book.shelf || 'General'}
              </span>

              <div className="flex items-center gap-1">
                <button
                  id={`fav-btn-${book.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateBook({ ...book, isFavorite: !book.isFavorite });
                  }}
                  className={`p-1.5 rounded-full border transition cursor-pointer ${
                    book.isFavorite
                      ? 'bg-[#7D5A50]/15 text-[#7D5A50] border-[#7D5A50]/30'
                      : 'text-[#A69F92] hover:text-[#5A5A40] border-transparent'
                  }`}
                  title={book.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-4 h-4 ${book.isFavorite ? 'fill-[#7D5A50]' : ''}`} />
                </button>
              </div>
            </div>

            {/* Centered 3D Book Interactive Showcase */}
            <div className="flex justify-center items-center py-6">
              <Book3D
                book={book}
                size="md"
                isOpen={isOpen}
                onToggleOpen={() => setOpenBookId(isOpen ? null : book.id)}
                onClick={() => {
                  sounds.playPageFlip();
                  onSelectBook(book);
                }}
              />
            </div>

            {/* Book Metadata & Reading Status */}
            <div className="space-y-3 pt-2">
              <div>
                <h4
                  onClick={() => onSelectBook(book)}
                  className="font-serif font-bold text-[#2C2C2C] hover:text-[#5A5A40] transition text-base leading-snug line-clamp-1 cursor-pointer"
                  title={book.title}
                >
                  {book.title}
                </h4>
                <p className="text-xs text-[#8C867A] truncate mt-0.5 font-medium">
                  by {book.authors.join(', ')}
                </p>
              </div>

              {/* Progress Slider / Reading Status Bar */}
              <div className="space-y-1.5 bg-[#EAE4D9]/60 p-2.5 rounded-xl border border-[#D9D1C2]">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {book.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#4A5D4A]" />
                    ) : book.status === 'reading' ? (
                      <Clock className="w-3.5 h-3.5 text-[#5A5A40]" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5 text-[#8C867A]" />
                    )}
                    <span className="capitalize font-semibold text-[#3D3A35] text-[11px]">
                      {book.status === 'reading' ? 'Reading' : book.status}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-[#5A5A40]">
                    {book.progressPages} / {book.pageCount} p. ({progressPercent}%)
                  </span>
                </div>

                <div className="w-full bg-[#D9D1C2] rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      book.status === 'completed'
                        ? 'bg-[#4A5D4A]'
                        : 'bg-[#5A5A40]'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Card Footer: Rating, Lent Info, and Inspect / Read Buttons */}
              <div className="flex items-center justify-between pt-1 text-xs text-[#8C867A]">
                <div className="flex items-center gap-1 text-[#B58D3D]">
                  <Star className="w-3.5 h-3.5 fill-[#B58D3D]" />
                  <span className="font-semibold text-[#2C2C2C]">
                    {book.rating > 0 ? book.rating.toFixed(1) : '—'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {(book.hasEpub || book.hasPdf) && onOpenEpubReader && (
                    <button
                      id={`read-epub-grid-${book.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.playPageFlip();
                        onOpenEpubReader(book);
                      }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EAE4D9] hover:bg-[#D9D1C2] text-[#5A5A40] border border-[#D9D1C2] transition flex items-center gap-1 cursor-pointer"
                      title={book.hasPdf ? 'Read PDF' : 'Read EPUB online'}
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Read</span>
                    </button>
                  )}

                  <button
                    id={`inspect-btn-${book.id}`}
                    onClick={() => {
                      sounds.playPageFlip();
                      onSelectBook(book);
                    }}
                    className="text-xs text-[#5A5A40] hover:text-[#3D3A35] font-semibold transition cursor-pointer"
                  >
                    3D View &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
