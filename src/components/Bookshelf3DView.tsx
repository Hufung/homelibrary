import React, { useState } from 'react';
import { Book } from '../types';
import { Book3D } from './Book3D';
import { Plus, Sparkles, BookOpen, Star, BookmarkCheck, Share2, Layers } from 'lucide-react';
import { sounds } from '../services/soundEffects';

interface Bookshelf3DViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onOpenScanner: () => void;
  onOpenEpubReader?: (book: Book) => void;
  shelfTheme: 'wood' | 'modern';
  onToggleTheme: () => void;
}

export const Bookshelf3DView: React.FC<Bookshelf3DViewProps> = ({
  books,
  onSelectBook,
  onOpenScanner,
  onOpenEpubReader,
  shelfTheme,
  onToggleTheme,
}) => {
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null);

  // Group books by shelf
  const shelvesMap: { [shelf: string]: Book[] } = {};
  
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#F5F2ED] rounded-2xl border border-[#D9D1C2] shadow-sm my-8">
        <div className="w-16 h-16 rounded-full bg-[#EAE4D9] flex items-center justify-center text-[#5A5A40] mb-4 border border-[#D9D1C2]">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-serif font-bold text-[#2C2C2C] mb-2">Your Bookshelf is Empty</h3>
        <p className="text-[#8C867A] text-sm max-w-md mb-6">
          Scan the ISBN barcode on any book in your room, or lookup by ISBN/title to fill your 3D library!
        </p>
        <button
          id="empty-shelf-scan-btn"
          onClick={onOpenScanner}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#5A5A40] hover:bg-[#4A4A34] text-white font-medium rounded-full transition-transform active:scale-95 shadow-lg shadow-[#5A5A40]/20 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Scan First Book ISBN
        </button>
      </div>
    );
  }

  books.forEach((b) => {
    const shelfName = b.shelf || 'General Collection';
    if (!shelvesMap[shelfName]) {
      shelvesMap[shelfName] = [];
    }
    shelvesMap[shelfName].push(b);
  });

  const shelfNames = Object.keys(shelvesMap);

  return (
    <div id="bookshelf-3d-container" className="space-y-12 py-4">
      {/* Shelf Theme & Atmosphere Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-[#5A5A40] text-sm font-medium">
          <Layers className="w-4 h-4 text-[#5A5A40]" />
          <span className="font-semibold text-[#2C2C2C]">3D Perspective Shelf Layout</span>
          <span className="text-xs text-[#8C867A]">({books.length} volumes indexed)</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="toggle-shelf-theme-btn"
            onClick={onToggleTheme}
            className="text-xs px-3.5 py-1.5 rounded-full border border-[#D9D1C2] bg-[#EAE4D9]/80 text-[#3D3A35] hover:bg-[#EAE4D9] transition flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <span>Theme:</span>
            <span className="font-bold text-[#5A5A40] capitalize">{shelfTheme} Grain</span>
          </button>
        </div>
      </div>

      {/* Render Each Physical Shelf Unit */}
      {shelfNames.map((shelfName, shelfIndex) => {
        const shelfBooks = shelvesMap[shelfName];

        return (
          <div
            key={shelfName}
            id={`shelf-tier-${shelfIndex}`}
            className="relative perspective-1500"
          >
            {/* Shelf Header Banner */}
            <div className="flex items-center justify-between mb-3 px-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5A5A40]" />
                <h3 className="font-serif text-lg font-bold text-[#2C2C2C] tracking-tight">
                  {shelfName}
                </h3>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EAE4D9] text-[#5A5A40] border border-[#D9D1C2]">
                  {shelfBooks.length} {shelfBooks.length === 1 ? 'book' : 'books'}
                </span>
              </div>

              <button
                id={`add-to-shelf-${shelfIndex}`}
                onClick={onOpenScanner}
                className="text-xs text-[#8C867A] hover:text-[#5A5A40] font-medium flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Book
              </button>
            </div>

            {/* 3D Shelf Construction Box */}
            <div
              className={`relative rounded-2xl overflow-visible p-6 pb-2 transition-colors duration-500 ${
                shelfTheme === 'wood'
                  ? 'wood-backdrop border border-[#D9D1C2] shadow-xl'
                  : 'bg-[#F5F2ED] border border-[#D9D1C2] shadow-lg'
              }`}
            >
              {/* Shelf Top Lighting Cast */}
              <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/5 to-transparent pointer-events-none rounded-t-2xl" />

              {/* Books Array along the Shelf Plank */}
              <div className="flex items-end gap-5 md:gap-7 overflow-x-auto pb-4 pt-8 px-4 scrollbar-thin">
                {shelfBooks.map((book, bookIdx) => {
                  const isHovered = hoveredBookId === book.id;
                  const isLeaning = bookIdx % 5 === 2; // subtle leaning variation
                  const leanAngle = isLeaning ? -6 : 0;

                  return (
                    <div
                      key={book.id}
                      id={`shelf-book-wrapper-${book.id}`}
                      onMouseEnter={() => {
                        setHoveredBookId(book.id);
                        sounds.playBookThud();
                      }}
                      onMouseLeave={() => setHoveredBookId(null)}
                      onClick={() => {
                        sounds.playPageFlip();
                        onSelectBook(book);
                      }}
                      className="group relative flex-shrink-0 cursor-pointer transition-all duration-300 ease-out"
                      style={{
                        transform: isHovered
                          ? 'translateY(-24px) translateZ(50px) scale(1.06)'
                          : `translateY(0px) rotateZ(${leanAngle}deg)`,
                        zIndex: isHovered ? 40 : 10,
                      }}
                    >
                      {/* Interactive 3D Book */}
                      <Book3D
                        book={book}
                        size="md"
                        interactive={true}
                        elevationShadow={false}
                      />

                      {/* Pull-out Hover Preview Tooltip Card */}
                      {isHovered && (
                        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-56 bg-[#F9F7F2]/95 text-[#2C2C2C] p-3 rounded-2xl border border-[#D9D1C2] shadow-2xl backdrop-blur-md pointer-events-none z-50 animate-in fade-in duration-200">
                          <p className="font-serif font-bold text-xs line-clamp-1 text-[#5A5A40]">
                            {book.title}
                          </p>
                          <p className="text-[10px] text-[#8C867A] truncate mb-1">
                            by {book.authors.join(', ')}
                          </p>

                          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[#EAE4D9]">
                            <span className="capitalize text-[#8C867A] font-medium">
                              {book.status === 'reading'
                                ? `Reading (${Math.round((book.progressPages / book.pageCount) * 100)}%)`
                                : book.status}
                            </span>
                            <div className="flex items-center gap-0.5 text-[#B58D3D] font-bold">
                              <Star className="w-3 h-3 fill-[#B58D3D]" />
                              <span>{book.rating || '—'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Quick Shelf Add Book Placeholder Book Frame */}
                <button
                  id={`shelf-quick-add-${shelfIndex}`}
                  onClick={onOpenScanner}
                  className="flex-shrink-0 w-24 h-48 rounded-r-md border-2 border-dashed border-[#D9D1C2] hover:border-[#5A5A40] bg-[#EAE4D9]/30 hover:bg-[#EAE4D9]/60 flex flex-col items-center justify-center text-[#8C867A] hover:text-[#5A5A40] transition-all p-3 text-center group cursor-pointer"
                >
                  <Plus className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-medium leading-tight">Add to Shelf</span>
                </button>
              </div>

              {/* Physical Wooden/Modern Shelf Plank Bottom */}
              <div
                className={`relative w-full h-7 rounded-b-xl ${
                  shelfTheme === 'wood' ? 'wood-shelf' : 'modern-shelf border-t border-[#D9D1C2]'
                }`}
              >
                {/* Plank Top Bevel Edge */}
                <div
                  className={`w-full h-1.5 ${
                    shelfTheme === 'wood' ? 'wood-shelf-top' : 'modern-shelf-top'
                  }`}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
