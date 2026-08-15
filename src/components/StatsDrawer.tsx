import React from 'react';
import { Book } from '../types';
import {
  X,
  BookOpen,
  CheckCircle2,
  Clock,
  Bookmark,
  Layers,
  Award,
  UserCheck,
  TrendingUp,
  Flame,
} from 'lucide-react';

interface StatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
}

export const StatsDrawer: React.FC<StatsDrawerProps> = ({ isOpen, onClose, books }) => {
  if (!isOpen) return null;

  const totalBooks = books.length;
  const completedBooks = books.filter((b) => b.status === 'completed').length;
  const readingBooks = books.filter((b) => b.status === 'reading').length;
  const toReadBooks = books.filter((b) => b.status === 'to-read').length;

  const totalPagesRead = books.reduce((acc, b) => acc + (b.progressPages || 0), 0);
  const totalPagesInLibrary = books.reduce((acc, b) => acc + (b.pageCount || 0), 0);

  const lentBooks = books.filter((b) => b.lentTo !== null && b.lentTo !== undefined);

  // Genre breakdown
  const categoryCounts: { [cat: string]: number } = {};
  books.forEach((b) => {
    b.categories.forEach((cat) => {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
  });

  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div
      id="stats-drawer-overlay"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-[#F9F7F2] border-l border-[#D9D1C2] h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-in slide-in-from-right duration-300 text-[#3D3A35]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE4D9] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#EAE4D9] border border-[#D9D1C2] flex items-center justify-center text-[#5A5A40]">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#2C2C2C] text-lg">Library Analytics</h3>
              <p className="text-xs text-[#8C867A]">Your personal reading journey</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#F5F2ED] p-4 rounded-2xl border border-[#D9D1C2] space-y-1">
            <div className="flex items-center justify-between text-[#8C867A] text-xs font-medium">
              <span>Total Volumes</span>
              <BookOpen className="w-4 h-4 text-[#5A5A40]" />
            </div>
            <p className="text-2xl font-bold font-serif text-[#2C2C2C]">{totalBooks}</p>
            <p className="text-[10px] text-[#8C867A]">{totalPagesInLibrary.toLocaleString()} total pages</p>
          </div>

          <div className="bg-[#F5F2ED] p-4 rounded-2xl border border-[#D9D1C2] space-y-1">
            <div className="flex items-center justify-between text-[#8C867A] text-xs font-medium">
              <span>Pages Read</span>
              <TrendingUp className="w-4 h-4 text-[#4A5D4A]" />
            </div>
            <p className="text-2xl font-bold font-serif text-[#4A5D4A]">{totalPagesRead.toLocaleString()}</p>
            <p className="text-[10px] text-[#8C867A]">
              {totalPagesInLibrary > 0
                ? `${Math.round((totalPagesRead / totalPagesInLibrary) * 100)}% of catalog`
                : '0%'}
            </p>
          </div>

          <div className="bg-[#F5F2ED] p-4 rounded-2xl border border-[#D9D1C2] space-y-1">
            <div className="flex items-center justify-between text-[#8C867A] text-xs font-medium">
              <span>Finished</span>
              <CheckCircle2 className="w-4 h-4 text-[#5A5A40]" />
            </div>
            <p className="text-2xl font-bold font-serif text-[#2C2C2C]">{completedBooks}</p>
            <p className="text-[10px] text-[#8C867A]">Completed books</p>
          </div>

          <div className="bg-[#F5F2ED] p-4 rounded-2xl border border-[#D9D1C2] space-y-1">
            <div className="flex items-center justify-between text-[#8C867A] text-xs font-medium">
              <span>In Progress</span>
              <Clock className="w-4 h-4 text-[#B58D3D]" />
            </div>
            <p className="text-2xl font-bold font-serif text-[#2C2C2C]">{readingBooks}</p>
            <p className="text-[10px] text-[#8C867A]">{toReadBooks} waiting on shelf</p>
          </div>
        </div>

        {/* Shelf Category Distribution */}
        <div className="bg-[#F5F2ED] p-4 rounded-2xl border border-[#D9D1C2] space-y-3">
          <h4 className="text-xs font-semibold text-[#5A5A40] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#5A5A40]" />
            Genre & Subject Distribution
          </h4>
          <div className="space-y-2.5">
            {sortedCategories.slice(0, 6).map(([cat, count]) => {
              const pct = Math.round((count / totalBooks) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#3D3A35] font-medium truncate">{cat}</span>
                    <span className="text-[#8C867A] font-mono">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-[#EAE4D9] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#5A5A40] h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lending Tracker Overview */}
        {lentBooks.length > 0 && (
          <div className="bg-[#F5F2ED] p-4 rounded-2xl border border-[#D9D1C2] space-y-3">
            <h4 className="text-xs font-semibold text-[#5A5A40] flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#5A5A40]" />
              Books Lent Out ({lentBooks.length})
            </h4>
            <div className="space-y-2">
              {lentBooks.map((b) => (
                <div key={b.id} className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#D9D1C2] text-xs flex items-center justify-between shadow-sm">
                  <div className="truncate mr-2">
                    <p className="font-serif font-bold text-[#2C2C2C] truncate">{b.title}</p>
                    <p className="text-[10px] text-[#8C867A]">Lent to <span className="text-[#5A5A40] font-semibold">{b.lentTo?.name}</span></p>
                  </div>
                  <span className="text-[10px] text-[#8C867A] font-mono flex-shrink-0">{b.lentTo?.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
