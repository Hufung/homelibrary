import React, { useState } from 'react';
import { ViewMode, FilterOptions, ReadingStatus } from '../types';
import {
  Sparkles,
  Camera,
  Search,
  BookOpen,
  LayoutGrid,
  Layers,
  BarChart3,
  Volume2,
  VolumeX,
  Download,
  Upload,
  Heart,
  SlidersHorizontal,
  Plus,
} from 'lucide-react';
import { sounds } from '../services/soundEffects';

interface NavbarProps {
  viewMode: ViewMode;
  onSetViewMode: (mode: ViewMode) => void;
  filters: FilterOptions;
  onUpdateFilters: (newFilters: Partial<FilterOptions>) => void;
  allShelves: string[];
  onOpenScanner: () => void;
  onOpenEpubUpload: () => void;
  onOpenStats: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  totalBooksCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  onSetViewMode,
  filters,
  onUpdateFilters,
  allShelves,
  onOpenScanner,
  onOpenEpubUpload,
  onOpenStats,
  onExportData,
  onImportData,
  totalBooksCount,
}) => {
  const [isMuted, setIsMuted] = useState(sounds.getIsMuted());
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.setMuted(next);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F9F7F2]/90 backdrop-blur-md border-b border-[#EAE4D9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 space-y-3">
        {/* Main Bar */}
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] text-white flex items-center justify-center shadow-md shadow-[#5A5A40]/15 font-serif font-bold text-lg">
              📚
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-xl text-[#2C2C2C] tracking-tight">
                  Bibliotheca 3D
                </h1>
                <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full bg-[#EAE4D9] text-[#5A5A40] border border-[#D9D1C2]">
                  ISBN Scanner
                </span>
              </div>
              <p className="text-[11px] text-[#8C867A] hidden sm:block font-medium">
                Personal 3D Archive & Library Registry
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C867A]" />
            <input
              type="text"
              placeholder="Search title, author, genre, ISBN..."
              value={filters.search}
              onChange={(e) => onUpdateFilters({ search: e.target.value })}
              className="w-full bg-[#EAE4D9]/60 border border-[#D9D1C2] focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] rounded-full pl-10 pr-4 py-2 text-xs text-[#2C2C2C] placeholder-[#A69F92] outline-none transition"
            />
          </div>

          {/* Actions & View Controls */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle Buttons */}
            <div className="flex bg-[#EAE4D9]/80 p-1 rounded-full border border-[#D9D1C2]">
              <button
                id="view-mode-bookshelf"
                onClick={() => onSetViewMode('bookshelf-3d')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'bookshelf-3d'
                    ? 'bg-[#5A5A40] text-white shadow-sm'
                    : 'text-[#8C867A] hover:text-[#5A5A40]'
                }`}
                title="3D Bookshelf View"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">3D Shelf</span>
              </button>

              <button
                id="view-mode-grid"
                onClick={() => onSetViewMode('grid-3d')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'grid-3d'
                    ? 'bg-[#5A5A40] text-white shadow-sm'
                    : 'text-[#8C867A] hover:text-[#5A5A40]'
                }`}
                title="3D Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">3D Grid</span>
              </button>
            </div>

            {/* Reading Stats Button */}
            <button
              id="stats-btn"
              onClick={onOpenStats}
              className="p-2.5 rounded-full border border-[#D9D1C2] bg-[#EAE4D9]/60 text-[#5A5A40] hover:bg-[#EAE4D9] transition"
              title="Reading Analytics & Statistics"
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleMute}
              className="p-2.5 rounded-full border border-[#D9D1C2] bg-[#EAE4D9]/60 text-[#5A5A40] hover:bg-[#EAE4D9] transition hidden sm:flex"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-[#A69F92]" /> : <Volume2 className="w-4 h-4 text-[#5A5A40]" />}
            </button>

            {/* EPUB Upload & Reader Action */}
            <button
              id="upload-epub-btn"
              onClick={() => {
                sounds.playScanSuccess();
                onOpenEpubUpload();
              }}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-[#EAE4D9] hover:bg-[#D9D1C2] text-[#5A5A40] border border-[#D9D1C2] font-semibold text-xs rounded-full transition cursor-pointer shadow-xs active:scale-95"
              title="Upload and Read EPUB E-Books"
            >
              <BookOpen className="w-4 h-4 text-[#5A5A40]" />
              <span className="hidden sm:inline">Upload EPUB</span>
            </button>

            {/* Primary Action: Scan ISBN */}
            <button
              id="main-scan-btn"
              onClick={() => {
                sounds.playScanSuccess();
                onOpenScanner();
              }}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#5A5A40] hover:bg-[#4A4A34] text-white font-medium text-xs rounded-full transition-all shadow-lg shadow-[#5A5A40]/20 active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span className="font-medium tracking-wide">Scan ISBN</span>
            </button>
          </div>
        </div>

        {/* Filter Pills & Secondary Search (Mobile) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Mobile Search */}
          <div className="w-full md:hidden relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C867A]" />
            <input
              type="text"
              placeholder="Search library..."
              value={filters.search}
              onChange={(e) => onUpdateFilters({ search: e.target.value })}
              className="w-full bg-[#EAE4D9]/60 border border-[#D9D1C2] focus:border-[#5A5A40] rounded-full pl-9 pr-3 py-1.5 text-xs text-[#2C2C2C] placeholder-[#A69F92] outline-none"
            />
          </div>

          {/* Shelf and Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Status Pills */}
            <div className="flex items-center gap-1 bg-[#EAE4D9]/60 p-1 rounded-full border border-[#D9D1C2]">
              {(['all', 'reading', 'to-read', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => onUpdateFilters({ status: st })}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium capitalize transition ${
                    filters.status === st
                      ? 'bg-[#5A5A40] text-white shadow-xs'
                      : 'text-[#8C867A] hover:text-[#5A5A40]'
                  }`}
                >
                  {st === 'all' ? 'All Books' : st.replace('-', ' ')}
                </button>
              ))}
            </div>

            {/* Favorite Filter */}
            <button
              onClick={() => onUpdateFilters({ favoritesOnly: !filters.favoritesOnly })}
              className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 border transition cursor-pointer ${
                filters.favoritesOnly
                  ? 'bg-[#7D5A50]/15 text-[#7D5A50] border-[#7D5A50]/30 font-semibold'
                  : 'bg-[#EAE4D9]/60 text-[#8C867A] border-[#D9D1C2] hover:text-[#5A5A40]'
              }`}
            >
              <Heart className={`w-3 h-3 ${filters.favoritesOnly ? 'fill-[#7D5A50]' : ''}`} />
              Favorites
            </button>

            {/* EPUB Only Filter */}
            <button
              onClick={() => onUpdateFilters({ epubOnly: !filters.epubOnly })}
              className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 border transition cursor-pointer ${
                filters.epubOnly
                  ? 'bg-[#5A5A40] text-white border-[#5A5A40] font-semibold shadow-xs'
                  : 'bg-[#EAE4D9]/60 text-[#8C867A] border-[#D9D1C2] hover:text-[#5A5A40]'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              EPUBs Only
            </button>

            {/* Shelf Filter Dropdown */}
            <select
              value={filters.shelf}
              onChange={(e) => onUpdateFilters({ shelf: e.target.value })}
              className="bg-[#EAE4D9]/80 border border-[#D9D1C2] text-[#3D3A35] text-[11px] font-medium rounded-full px-3 py-1 outline-none"
            >
              <option value="all">All Shelves ({allShelves.length})</option>
              {allShelves.map((sh) => (
                <option key={sh} value={sh}>
                  {sh}
                </option>
              ))}
            </select>
          </div>

          {/* Sort & Data Backup Controls */}
          <div className="flex items-center gap-2 ml-auto text-xs text-[#8C867A]">
            {/* Sort Dropdown */}
            <select
              value={filters.sortBy}
              onChange={(e) => onUpdateFilters({ sortBy: e.target.value as FilterOptions['sortBy'] })}
              className="bg-[#EAE4D9]/80 border border-[#D9D1C2] text-[#3D3A35] text-[11px] font-medium rounded-full px-3 py-1 outline-none"
            >
              <option value="addedAt">Recent Added</option>
              <option value="rating">Top Rated</option>
              <option value="title">Title (A-Z)</option>
              <option value="progress">Reading Progress</option>
              <option value="pageCount">Page Count</option>
            </select>

            {/* Export / Import */}
            <button
              onClick={onExportData}
              className="p-1.5 rounded-full border border-[#D9D1C2] hover:bg-[#EAE4D9] text-[#8C867A] hover:text-[#5A5A40] transition"
              title="Export Bookshelf JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <label
              className="p-1.5 rounded-full border border-[#D9D1C2] hover:bg-[#EAE4D9] text-[#8C867A] hover:text-[#5A5A40] cursor-pointer transition"
              title="Import Bookshelf JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".json" onChange={onImportData} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </header>
  );
};
