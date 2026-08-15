import React, { useState } from 'react';
import { EpubBookmark } from '../../types';
import { List, Bookmark, X, Search, ChevronRight, Trash2, ExternalLink } from 'lucide-react';

export interface TocItem {
  id: string;
  href: string;
  label: string;
  subitems?: TocItem[];
}

interface TocBookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  toc: TocItem[];
  bookmarks: EpubBookmark[];
  currentCfi?: string;
  onNavigateHref: (href: string) => void;
  onNavigateCfi: (cfi: string) => void;
  onDeleteBookmark: (id: string) => void;
}

export const TocBookmarksDrawer: React.FC<TocBookmarksDrawerProps> = ({
  isOpen,
  onClose,
  toc,
  bookmarks,
  onNavigateHref,
  onNavigateCfi,
  onDeleteBookmark,
}) => {
  const [activeTab, setActiveTab] = useState<'toc' | 'bookmarks'>('toc');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const renderTocItem = (item: TocItem, depth = 0) => {
    const isMatched =
      !searchQuery.trim() || item.label.toLowerCase().includes(searchQuery.toLowerCase());

    return (
      <div key={item.id || item.href} className="space-y-1">
        {isMatched && (
          <button
            onClick={() => {
              onNavigateHref(item.href);
              onClose();
            }}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
            className="w-full text-left py-2 pr-3 rounded-xl hover:bg-[#EAE4D9] text-xs font-medium text-[#3D3A35] transition flex items-center justify-between group cursor-pointer"
          >
            <span className="truncate">{item.label}</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#8C867A] group-hover:text-[#5A5A40] transition-transform group-hover:translate-x-0.5 flex-shrink-0" />
          </button>
        )}

        {item.subitems && item.subitems.length > 0 && (
          <div className="space-y-0.5">
            {item.subitems.map((sub) => renderTocItem(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      id="epub-toc-drawer-overlay"
      className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#F9F7F2] border-r border-[#D9D1C2] h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-300 text-[#3D3A35]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#EAE4D9] bg-[#F5F2ED]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('toc')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                activeTab === 'toc'
                  ? 'bg-[#5A5A40] text-white shadow-sm'
                  : 'text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Contents
            </button>

            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                activeTab === 'bookmarks'
                  ? 'bg-[#5A5A40] text-white shadow-sm'
                  : 'text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              Bookmarks ({bookmarks.length})
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 1: Table of Contents */}
        {activeTab === 'toc' && (
          <>
            <div className="p-3 border-b border-[#EAE4D9] bg-[#F5F2ED]/60">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C867A]" />
                <input
                  type="text"
                  placeholder="Filter chapters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#D9D1C2] rounded-full pl-8 pr-3 py-1.5 text-xs text-[#2C2C2C] placeholder:text-[#A69F92] outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {toc.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#8C867A]">
                  No table of contents provided in this EPUB.
                </div>
              ) : (
                toc.map((item) => renderTocItem(item, 0))
              )}
            </div>
          </>
        )}

        {/* Tab 2: Bookmarks */}
        {activeTab === 'bookmarks' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {bookmarks.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2 text-[#8C867A]">
                <Bookmark className="w-8 h-8 mx-auto text-[#D9D1C2]" />
                <p className="text-sm font-medium text-[#2C2C2C]">No bookmarks yet</p>
                <p className="text-xs">
                  Tap the bookmark icon on the top reader bar to save your place anytime.
                </p>
              </div>
            ) : (
              bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="bg-[#FFFFFF] rounded-2xl border border-[#D9D1C2] p-3 shadow-sm flex items-center justify-between gap-3 group"
                >
                  <div
                    onClick={() => {
                      onNavigateCfi(bm.cfi);
                      onClose();
                    }}
                    className="flex-1 cursor-pointer truncate"
                  >
                    <p className="text-xs font-semibold text-[#2C2C2C] truncate">
                      {bm.label || bm.chapterTitle || 'Saved Location'}
                    </p>
                    <p className="text-[10px] text-[#8C867A] mt-0.5">
                      {Math.round(bm.percentage)}% of book • {new Date(bm.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onNavigateCfi(bm.cfi);
                        onClose();
                      }}
                      className="p-1.5 text-[#5A5A40] hover:bg-[#EAE4D9] rounded-lg transition"
                      title="Jump to bookmark"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteBookmark(bm.id)}
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
        )}
      </div>
    </div>
  );
};
