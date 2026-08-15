import React, { useState, useRef } from 'react';
import { Book } from '../types';
import { Bookmark, Star, Sparkles, BookOpen } from 'lucide-react';
import { sounds } from '../services/soundEffects';

interface Book3DProps {
  book: Book;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  width?: number;
  height?: number;
  interactive?: boolean; // Mouse tilt tracking
  isOpen?: boolean; // Front cover open state
  onToggleOpen?: () => void;
  onClick?: () => void;
  className?: string;
  showStatusBadge?: boolean;
  elevationShadow?: boolean;
  manualRotation?: { x: number; y: number; z: number }; // For 360 inspector
}

export const Book3D: React.FC<Book3DProps> = ({
  book,
  size = 'md',
  width: customWidth,
  height: customHeight,
  interactive = true,
  isOpen = false,
  onToggleOpen,
  onClick,
  className = '',
  showStatusBadge = false,
  elevationShadow = true,
  manualRotation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Calculate dimensions based on size presets
  let w = 150;
  let h = 220;

  if (size === 'sm') {
    w = 110;
    h = 160;
  } else if (size === 'md') {
    w = 160;
    h = 240;
  } else if (size === 'lg') {
    w = 210;
    h = 310;
  } else if (size === 'xl') {
    w = 260;
    h = 380;
  }

  if (customWidth) w = customWidth;
  if (customHeight) h = customHeight;

  // Calculate spine thickness based on page count (min 18px, max 54px)
  const pageRatio = Math.min(Math.max((book.pageCount || 250) / 800, 0.25), 1);
  const thickness = Math.round(18 + pageRatio * (w > 180 ? 36 : 24));

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || manualRotation) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Subtle natural tilt
    const rotateY = ((x - centerX) / centerX) * 22; // max ~22 deg
    const rotateX = -((y - centerY) / centerY) * 22;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseEnter = () => {
    if (interactive) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setIsHovered(false);
      setTilt({ x: 0, y: 0 });
    }
  };

  // Determine transform rotation
  let transformString = '';
  if (manualRotation) {
    transformString = `rotateX(${manualRotation.x}deg) rotateY(${manualRotation.y}deg) rotateZ(${manualRotation.z}deg)`;
  } else if (interactive && isHovered) {
    transformString = `rotateX(${tilt.x}deg) rotateY(${tilt.y - 12}deg) translateZ(16px)`;
  } else {
    // Default rest angle showing slight 3D depth
    transformString = `rotateX(4deg) rotateY(-18deg) rotateZ(0deg)`;
  }

  const readingPercent = book.pageCount > 0 
    ? Math.min(Math.round((book.progressPages / book.pageCount) * 100), 100) 
    : 0;

  return (
    <div
      id={`book-3d-${book.id}`}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative select-none perspective-1500 cursor-pointer ${className}`}
      style={{
        width: `${w}px`,
        height: `${h}px`,
      }}
    >
      {/* 3D Root Book Box */}
      <div
        className="relative w-full h-full transform-style-3d transition-transform duration-200 ease-out"
        style={{
          transform: transformString,
          transformOrigin: 'center center',
        }}
      >
        {/* Soft Drop Shadow on Surface */}
        {elevationShadow && (
          <div
            className="absolute rounded-full pointer-events-none transition-all duration-300"
            style={{
              width: `${w * 1.1}px`,
              height: `${thickness * 2.2}px`,
              bottom: `-${thickness + 10}px`,
              left: `${-w * 0.05}px`,
              background: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.45) 0%, rgba(0,0,0,0) 70%)',
              transform: `rotateX(90deg) translateZ(-${h / 2}px) ${isHovered ? 'scale(1.15) opacity-90' : 'scale(1) opacity-60'}`,
              filter: 'blur(8px)',
            }}
          />
        )}

        {/* 1. FRONT COVER (Hinged if isOpen is supported) */}
        <div
          className="absolute inset-0 rounded-r-md overflow-hidden transform-style-3d transition-transform duration-500 ease-in-out"
          style={{
            transformOrigin: 'left center',
            transform: isOpen ? `translateZ(${thickness / 2}px) rotateY(-140deg)` : `translateZ(${thickness / 2}px)`,
            boxShadow: isOpen 
              ? '-4px 0 16px rgba(0,0,0,0.5)' 
              : 'inset 4px 0 8px rgba(0,0,0,0.3), 2px 2px 10px rgba(0,0,0,0.25)',
            backgroundColor: book.spineColor || '#1e293b',
          }}
        >
          {/* Front Cover Front-Face */}
          <div className="absolute inset-0 w-full h-full backface-hidden">
            {book.coverUrl && !imageError ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              /* Procedural Art Cover if no image */
              <div
                className="w-full h-full p-4 flex flex-col justify-between text-white relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${book.spineColor} 0%, ${book.accentColor || '#3b82f6'} 100%)`,
                }}
              >
                {/* Vintage Frame Inset */}
                <div className="absolute inset-2.5 border border-white/30 rounded-sm pointer-events-none" />
                <div className="absolute inset-3 border border-white/20 rounded-sm pointer-events-none" />

                <div className="relative z-10">
                  <div className="text-[10px] uppercase tracking-widest text-white/70 font-semibold mb-1 truncate">
                    {book.categories[0] || 'Edition'}
                  </div>
                  <h3 className="font-serif font-bold text-sm leading-snug line-clamp-3 drop-shadow-sm">
                    {book.title}
                  </h3>
                </div>

                <div className="relative z-10 pt-2 border-t border-white/20">
                  <p className="text-[11px] text-white/90 font-medium truncate">
                    {book.authors.join(', ')}
                  </p>
                  <p className="text-[9px] text-white/60 truncate mt-0.5">
                    {book.publisher}
                  </p>
                </div>
              </div>
            )}

            {/* Spine Hinge Indentation Line */}
            <div className="absolute top-0 bottom-0 left-3 w-1 bg-black/25 pointer-events-none shadow-sm" />
            <div className="absolute top-0 bottom-0 left-3.5 w-0.5 bg-white/20 pointer-events-none" />

            {/* Glossy Light Reflection Sheen */}
            <div className="absolute inset-0 book-sheen pointer-events-none" />

            {/* Bookmark Ribbon on Cover Corner */}
            {book.isFavorite && (
              <div className="absolute top-0 right-3 w-5 h-8 bg-[#5A5A40] shadow-md flex items-center justify-center text-white pb-1"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}
              >
                <Star className="w-3 h-3 fill-[#EAE4D9] text-[#EAE4D9]" />
              </div>
            )}
          </div>

          {/* Front Cover Inside-Face (Seen when open) */}
          <div
            className="absolute inset-0 w-full h-full p-4 bg-[#F9F7F2] text-[#3D3A35] flex flex-col justify-between backface-hidden"
            style={{
              transform: 'rotateY(180deg)',
              boxShadow: 'inset -3px 0 6px rgba(0,0,0,0.15)',
            }}
          >
            <div>
              <span className="text-[9px] uppercase tracking-widest text-[#8C867A] font-bold block mb-1">
                Ex Libris • Personal Archive
              </span>
              <h4 className="font-serif font-bold text-xs text-[#2C2C2C] line-clamp-2">
                {book.title}
              </h4>
              <p className="text-[10px] text-[#8C867A] italic mt-0.5 font-medium">
                by {book.authors.join(', ')}
              </p>
            </div>

            <div className="text-[10px] text-[#3D3A35] leading-relaxed line-clamp-4 italic bg-[#F5F2ED] p-2 rounded-lg border border-[#D9D1C2]">
              "{book.quotes[0] || book.description?.slice(0, 120) || 'Happy reading!'}"
            </div>

            <div className="flex items-center justify-between text-[9px] text-[#8C867A] border-t border-[#EAE4D9] pt-1">
              <span>{book.pageCount} pages</span>
              <span>ISBN {book.isbn.slice(-4)}</span>
            </div>
          </div>
        </div>

        {/* 2. INNER FIRST PAGE SPREAD (Visible when book is opened) */}
        {isOpen && (
          <div
            className="absolute inset-0 bg-[#FCFBF8] rounded-r-sm p-4 text-[#3D3A35] flex flex-col justify-between transform-style-3d shadow-md"
            style={{
              transform: `translateZ(${thickness / 2 - 2}px)`,
            }}
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#EAE4D9] pb-1 mb-2">
                <span className="text-[9px] font-bold text-[#8C867A] uppercase">Chapter 1</span>
                <span className="text-[9px] text-[#8C867A]">p. 1</span>
              </div>
              <p className="text-[10px] text-[#3D3A35] leading-relaxed line-clamp-6 font-serif">
                {book.description || 'No description available for this volume.'}
              </p>
            </div>
            
            <div className="pt-2 border-t border-[#EAE4D9]">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-[#8C867A] font-medium">Reading Progress</span>
                <span className="font-bold text-[#5A5A40]">{readingPercent}%</span>
              </div>
              <div className="w-full bg-[#EAE4D9] rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-[#5A5A40] h-full rounded-full transition-all duration-300"
                  style={{ width: `${readingPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. SPINE (Left Face, rotated -90deg Y) */}
        <div
          className="absolute top-0 bottom-0 left-0 flex flex-col justify-between py-3 px-1 text-white font-sans text-center overflow-hidden transform-style-3d"
          style={{
            width: `${thickness}px`,
            height: `${h}px`,
            left: `-${thickness / 2}px`,
            transform: 'rotateY(-90deg)',
            backgroundColor: book.spineColor || '#1e293b',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
            borderLeft: '1px solid rgba(255,255,255,0.15)',
            borderRight: '1px solid rgba(0,0,0,0.3)',
          }}
        >
          {/* Top Spine Rib Decoration */}
          <div className="w-full space-y-1">
            <div className="h-0.5 bg-amber-400/40 rounded-full mx-auto w-3/4" />
            <div className="h-0.5 bg-amber-400/20 rounded-full mx-auto w-1/2" />
          </div>

          {/* Spine Vertical Title */}
          <div className="flex-1 flex items-center justify-center my-1 overflow-hidden">
            <span
              className="text-[11px] font-bold tracking-wide uppercase text-white/95 whitespace-nowrap drop-shadow-sm"
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)',
                maxHeight: `${h - 70}px`,
              }}
            >
              {book.title}
            </span>
          </div>

          {/* Spine Bottom Author & Publisher */}
          <div className="w-full space-y-1">
            <span
              className="text-[8px] text-white/70 block truncate font-medium"
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)',
                maxHeight: '35px',
                margin: '0 auto',
              }}
            >
              {book.authors[0] || ''}
            </span>
            <div className="h-0.5 bg-amber-400/40 rounded-full mx-auto w-3/4" />
          </div>
        </div>

        {/* 4. BACK COVER (Rotated 180deg Y) */}
        <div
          className="absolute inset-0 rounded-l-md p-4 text-white flex flex-col justify-between overflow-hidden transform-style-3d"
          style={{
            transform: `translateZ(-${thickness / 2}px) rotateY(180deg)`,
            backgroundColor: book.spineColor || '#1e293b',
            boxShadow: 'inset -4px 0 8px rgba(0,0,0,0.3)',
          }}
        >
          <div>
            <div className="flex items-center gap-1.5 text-[#B58D3D] mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i < book.rating ? 'fill-[#B58D3D]' : 'text-white/30'}`}
                />
              ))}
            </div>
            <p className="text-[10px] text-white/80 line-clamp-5 leading-relaxed">
              {book.description || 'Synopsis currently not indexed in local shelf registry.'}
            </p>
          </div>

          {/* Barcode Mock on Back Cover */}
          <div className="bg-[#F9F7F2] text-[#2C2C2C] p-1.5 rounded flex items-center justify-between border border-[#D9D1C2]">
            <div className="flex flex-col">
              <span className="text-[7px] font-mono font-bold tracking-tighter">ISBN {book.isbn}</span>
              <div className="flex gap-[1.5px] items-center h-4 mt-0.5">
                {[4, 2, 6, 2, 5, 2, 4, 1, 6, 2, 4, 3, 5, 2, 4, 2, 5, 3].map((bar, idx) => (
                  <div key={idx} className="bg-[#2C2C2C] h-full" style={{ width: `${bar > 3 ? 2 : 1}px` }} />
                ))}
              </div>
            </div>
            <span className="text-[8px] font-bold text-[#8C867A] uppercase">{book.categories[0] || 'Book'}</span>
          </div>
        </div>

        {/* 5. RIGHT EDGE / FORE-EDGE (Pages paper texture, rotated 90deg Y) */}
        <div
          className="absolute top-0 bottom-0 right-0 page-stripes transform-style-3d"
          style={{
            width: `${thickness}px`,
            height: `${h}px`,
            right: `-${thickness / 2}px`,
            transform: 'rotateY(90deg)',
            boxShadow: 'inset 0 0 4px rgba(0,0,0,0.15)',
            borderTop: '1px solid #dcd3be',
            borderBottom: '1px solid #dcd3be',
          }}
        />

        {/* 6. TOP EDGE (Pages paper texture, rotated 90deg X) */}
        <div
          className="absolute left-0 right-0 top-0 page-stripes-horizontal transform-style-3d"
          style={{
            height: `${thickness}px`,
            width: `${w}px`,
            top: `-${thickness / 2}px`,
            transform: 'rotateX(90deg)',
            boxShadow: 'inset 0 0 4px rgba(0,0,0,0.15)',
          }}
        />

        {/* 7. BOTTOM EDGE (Pages paper texture, rotated -90deg X) */}
        <div
          className="absolute left-0 right-0 bottom-0 page-stripes-horizontal transform-style-3d"
          style={{
            height: `${thickness}px`,
            width: `${w}px`,
            bottom: `-${thickness / 2}px`,
            transform: 'rotateX(-90deg)',
            boxShadow: 'inset 0 0 4px rgba(0,0,0,0.15)',
          }}
        />
      </div>

      {/* Floating Status & Progress Badge */}
      {showStatusBadge && (
        <div className="absolute -bottom-7 left-0 right-0 flex items-center justify-between text-[11px] px-1 pointer-events-none">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
              book.status === 'reading'
                ? 'bg-[#EAE4D9] text-[#5A5A40] border border-[#D9D1C2]'
                : book.status === 'completed'
                ? 'bg-[#4A5D4A]/15 text-[#4A5D4A] border border-[#4A5D4A]/30'
                : 'bg-[#F5F2ED] text-[#8C867A] border border-[#D9D1C2]'
            }`}
          >
            {book.status === 'reading' ? `${readingPercent}% Read` : book.status}
          </span>

          {book.lentTo && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#7D5A50]/15 text-[#7D5A50] border border-[#7D5A50]/30 font-medium">
              Lent to {book.lentTo.name}
            </span>
          )}
        </div>
      )}

      {/* Quick Open Flip Button if onToggleOpen is provided */}
      {onToggleOpen && (
        <button
          id={`toggle-open-${book.id}`}
          onClick={(e) => {
            e.stopPropagation();
            sounds.playPageFlip();
            onToggleOpen();
          }}
          className="absolute -top-3 -right-3 z-30 p-1.5 rounded-full bg-[#F9F7F2] shadow-md border border-[#D9D1C2] hover:bg-[#EAE4D9] text-[#5A5A40] transition-transform active:scale-90 cursor-pointer"
          title={isOpen ? 'Close book cover' : 'Open book cover'}
        >
          <BookOpen className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
