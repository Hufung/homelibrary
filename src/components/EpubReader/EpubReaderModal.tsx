import React, { useState, useEffect, useRef, useCallback } from 'react';
import ePub, { Book as EpubBook, Rendition, Location } from 'epubjs';
import {
  Book,
  EpubHighlight,
  EpubBookmark,
  HighlightColor,
  ReaderSettings,
  ReaderThemeMode,
} from '../../types';
import { epubStorage } from '../../services/epubStorage';
import { createSampleEpubBlob } from '../../services/epubParser';
import { sounds } from '../../services/soundEffects';
import { HighlightingColors, READER_THEMES, DEFAULT_READER_SETTINGS } from './readerConstants';
import { HighlightMenu } from './HighlightMenu';
import { HighlightsDrawer } from './HighlightsDrawer';
import { TocBookmarksDrawer, TocItem } from './TocBookmarksDrawer';
import { ReaderSettingsModal } from './ReaderSettingsModal';
import { DictionaryPanel } from '../Dictionary/DictionaryPanel';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  List,
  Type,
  Maximize2,
  Minimize2,
  Sparkles,
  Search,
  RotateCcw,
  Loader2,
  Moon,
  Sun,
  X,
} from 'lucide-react';

interface EpubReaderModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBook: (updatedBook: Book) => void;
}

export const EpubReaderModal: React.FC<EpubReaderModalProps> = ({
  book,
  isOpen,
  onClose,
  onUpdateBook,
}) => {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const bookInstanceRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Opening digital codex...');
  const [loadError, setLoadError] = useState<string | null>(null);

  // HUD and Navigation overlay (collapsible on tap)
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reading state
  const [currentCfi, setCurrentCfi] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState<number>(book.readingPercentage || 0);
  const [currentChapterTitle, setCurrentChapterTitle] = useState<string>('');
  const [toc, setToc] = useState<TocItem[]>([]);
  const [totalLocationsCount, setTotalLocationsCount] = useState<number>(0);

  // Reader Settings (persisted per user)
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    try {
      const stored = localStorage.getItem('bibliotheca_reader_settings');
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_READER_SETTINGS;
  });

  // Drawers & Modals
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isHighlightsOpen, setIsHighlightsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [dictWord, setDictWord] = useState('');

  // Data: Highlights & Bookmarks
  const [highlights, setHighlights] = useState<EpubHighlight[]>([]);
  const [bookmarks, setBookmarks] = useState<EpubBookmark[]>([]);

  // Text selection highlight menu state
  const [activeSelection, setActiveSelection] = useState<{
    cfiRange: string;
    text: string;
    position: { top: number; left: number };
    existingHighlight?: EpubHighlight;
  } | null>(null);

  // Persist reader settings
  useEffect(() => {
    try {
      localStorage.setItem('bibliotheca_reader_settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Load highlights & bookmarks from IndexedDB
  const refreshUserData = useCallback(async () => {
    try {
      const [storedHighlights, storedBookmarks] = await Promise.all([
        epubStorage.getHighlights(book.id),
        epubStorage.getBookmarks(book.id),
      ]);
      setHighlights(storedHighlights);
      setBookmarks(storedBookmarks);
    } catch (err) {
      console.warn('Failed to load user annotations', err);
    }
  }, [book.id]);

  useEffect(() => {
    if (isOpen) {
      refreshUserData();
    }
  }, [isOpen, refreshUserData]);

  // Apply theme and styling to rendition
  const applyRenditionStyles = useCallback(
    (rend: Rendition, curSettings: ReaderSettings) => {
      const themeConfig = READER_THEMES[curSettings.theme];

      // Register theme
      rend.themes.register(curSettings.theme, {
        body: {
          background: `${themeConfig.bg} !important`,
          color: `${themeConfig.text} !important`,
          'font-family':
            curSettings.fontFamily === 'serif'
              ? 'Georgia, serif !important'
              : curSettings.fontFamily === 'sans'
              ? 'system-ui, -apple-system, sans-serif !important'
              : curSettings.fontFamily === 'merriweather'
              ? '"Palatino Linotype", Palatino, serif !important'
              : 'ui-monospace, monospace !important',
          'line-height': `${curSettings.lineHeight} !important`,
          padding: '0 8px !important',
        },
        p: {
          'line-height': `${curSettings.lineHeight} !important`,
          margin: '0 0 1.25em 0 !important',
        },
        'a, a:link, a:visited': {
          color: `${themeConfig.text} !important`,
        },
      });

      rend.themes.select(curSettings.theme);
      rend.themes.fontSize(`${curSettings.fontSize}px`);
    },
    []
  );

  // Register all saved highlights onto the rendition
  const renderHighlightsOntoViewer = useCallback(
    (rend: Rendition, hlList: EpubHighlight[]) => {
      hlList.forEach((hl) => {
        try {
          const colorDef = HighlightingColors[hl.color] || HighlightingColors.yellow;

          rend.annotations.highlight(
            hl.cfiRange,
            {},
            (e: MouseEvent) => {
              e.stopPropagation();
              const rect = (e.target as HTMLElement)?.getBoundingClientRect();
              setActiveSelection({
                cfiRange: hl.cfiRange,
                text: hl.text,
                position: {
                  top: (rect?.top || 100) - 60,
                  left: (rect?.left || window.innerWidth / 2) + (rect?.width || 0) / 2,
                },
                existingHighlight: hl,
              });
            },
            'custom-epub-highlight',
            {
              fill: colorDef.fillHex,
              'fill-opacity': '0.35',
              'mix-blend-mode': 'multiply',
            }
          );
        } catch (err) {
          // Ignore range mismatch on different spine item
        }
      });
    },
    []
  );

  // Main EPUB initialization effect
  useEffect(() => {
    if (!isOpen || !viewerContainerRef.current) return;

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);
    setLoadingStatus('Loading EPUB data...');

    const initializeReader = async () => {
      try {
        // 1. Retrieve EPUB buffer from IndexedDB or generate starter sample
        let epubBuffer = await epubStorage.getEpubFile(book.id);

        if (!epubBuffer) {
          setLoadingStatus('Preparing demo classic edition...');
          const sampleBlob = await createSampleEpubBlob();
          epubBuffer = await sampleBlob.arrayBuffer();
          // Store so next open is instant
          await epubStorage.saveEpubFile(book.id, epubBuffer, 'sample_meditations.epub');
        }

        if (!isMounted || !viewerContainerRef.current) return;

        // Clean previous instances
        if (renditionRef.current) {
          try {
            renditionRef.current.destroy();
          } catch {}
        }
        if (bookInstanceRef.current) {
          try {
            bookInstanceRef.current.destroy();
          } catch {}
        }
        viewerContainerRef.current.innerHTML = '';

        setLoadingStatus('Formatting pages and typography...');

        // 2. Instantiate ePub
        const epubInstance = ePub(epubBuffer);
        bookInstanceRef.current = epubInstance;

        // 3. Render
        const rendition = epubInstance.renderTo(viewerContainerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: settings.spread,
          minSpreadWidth: 800,
        });
        renditionRef.current = rendition;

        // Apply theme
        applyRenditionStyles(rendition, settings);

        // 4. Retrieve saved reading position
        const savedLocation = await epubStorage.getReadingLocation(book.id);
        const targetCfi = savedLocation?.cfi || book.lastReadCfi;

        await rendition.display(targetCfi || undefined);

        // 5. Load Navigation / Table of Contents
        const nav = await epubInstance.loaded.navigation;
        if (isMounted && nav && nav.toc) {
          const mapToc = (items: any[]): TocItem[] => {
            return items.map((item) => ({
              id: item.id || item.href,
              href: item.href,
              label: item.label ? item.label.trim() : 'Chapter',
              subitems: item.subitems ? mapToc(item.subitems) : undefined,
            }));
          };
          setToc(mapToc(nav.toc));
        }

        // Generate locations for accurate progress calculation
        epubInstance.ready.then(() => {
          epubInstance.locations.generate(1000).then((locs) => {
            if (isMounted) {
              setTotalLocationsCount(locs.length);
            }
          });
        });

        // 6. Hook up Relocated event (reading position & progress update)
        rendition.on('relocated', (location: Location) => {
          if (!isMounted) return;

          const startCfi = location.start.cfi;
          setCurrentCfi(startCfi);

          let pct = 0;
          if (epubInstance.locations && epubInstance.locations.length() > 0) {
            pct = Math.round(epubInstance.locations.percentageFromCfi(startCfi) * 100);
          } else if (location.start.percentage) {
            pct = Math.round(location.start.percentage * 100);
          }

          setProgressPercentage(pct);

          // Find chapter title from TOC
          if (nav && nav.toc) {
            const currentItem = nav.toc.find((item: any) =>
              location.start.href.includes(item.href.split('#')[0])
            );
            if (currentItem) {
              setCurrentChapterTitle(currentItem.label.trim());
            }
          }

          // Persist position
          epubStorage.saveReadingLocation(book.id, startCfi, pct);

          // Update library book state
          const estCurrentPage = Math.round((pct / 100) * book.pageCount);
          onUpdateBook({
            ...book,
            lastReadCfi: startCfi,
            readingPercentage: pct,
            progressPages: Math.max(book.progressPages, estCurrentPage),
            status: pct >= 98 ? 'completed' : 'reading',
          });
        });

        // 7. Hook up Text Selection & Highlighting
        rendition.on('selected', (cfiRange: string, contents: any) => {
          if (!isMounted) return;

          const iframe = viewerContainerRef.current?.querySelector('iframe');
          const iframeRect = iframe?.getBoundingClientRect();

          const selection = contents.window.getSelection();
          if (!selection || selection.isCollapsed) return;

          const range = selection.getRangeAt(0);
          const rangeRect = range.getBoundingClientRect();
          const selectedText = selection.toString().trim();

          if (selectedText.length === 0) return;

          // Calculate popup coordinates relative to modal viewport
          const top = (iframeRect?.top || 0) + rangeRect.top - 60;
          const left = (iframeRect?.left || 0) + rangeRect.left + rangeRect.width / 2;

          setActiveSelection({
            cfiRange,
            text: selectedText,
            position: { top, left },
          });
        });

        // 8. Mobile touch gestures & tap zones inside EPUB iframe
        rendition.hooks.content.register((contents: any) => {
          let touchStartX = 0;
          let touchStartY = 0;

          contents.document.addEventListener('touchstart', (e: TouchEvent) => {
            touchStartX = e.changedTouches[0].clientX;
            touchStartY = e.changedTouches[0].clientY;
          });

          contents.document.addEventListener('touchend', (e: TouchEvent) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;

            // Horizontal Swipe navigation
            if (Math.abs(deltaX) > 45 && Math.abs(deltaY) < 35) {
              if (deltaX < 0) {
                sounds.playPageFlip();
                rendition.next();
              } else {
                sounds.playPageFlip();
                rendition.prev();
              }
              return;
            }

            // Center Tap zone for toggling HUD
            const docWidth = contents.window.innerWidth;
            const tapX = touchEndX;
            const leftZone = docWidth * 0.25;
            const rightZone = docWidth * 0.75;

            if (tapX < leftZone) {
              sounds.playPageFlip();
              rendition.prev();
            } else if (tapX > rightZone) {
              sounds.playPageFlip();
              rendition.next();
            } else {
              // Center tap: toggle HUD
              setIsHudVisible((prev) => !prev);
            }
          });

          // Keyboard listeners inside iframe
          contents.document.addEventListener('keyup', (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
              sounds.playPageFlip();
              rendition.next();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
              sounds.playPageFlip();
              rendition.prev();
            }
          });
        });

        // 9. Render existing highlights
        const initialHighlights = await epubStorage.getHighlights(book.id);
        renderHighlightsOntoViewer(rendition, initialHighlights);

        setIsLoading(false);
      } catch (err: any) {
        console.error('Failed to initialize EPUB', err);
        if (isMounted) {
          setLoadError('Failed to load EPUB. Please check if the file is DRM-free and valid.');
          setIsLoading(false);
        }
      }
    };

    initializeReader();

    return () => {
      isMounted = false;
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy();
        } catch {}
      }
      if (bookInstanceRef.current) {
        try {
          bookInstanceRef.current.destroy();
        } catch {}
      }
    };
  }, [isOpen, book.id, applyRenditionStyles, renderHighlightsOntoViewer]);

  // Update styles when settings change without re-instantiating ePub
  useEffect(() => {
    if (renditionRef.current) {
      applyRenditionStyles(renditionRef.current, settings);
    }
  }, [settings, applyRenditionStyles]);

  // Keyboard navigation on outer window
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeSelection || isHighlightsOpen || isTocOpen || isSettingsOpen) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        sounds.playPageFlip();
        renditionRef.current?.next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        sounds.playPageFlip();
        renditionRef.current?.prev();
      } else if (e.key === 'Escape') {
        if (isHudVisible) {
          onClose();
        } else {
          setIsHudVisible(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeSelection, isHighlightsOpen, isTocOpen, isSettingsOpen, isHudVisible, onClose]);

  // --- HIGHLIGHT ACTIONS ---
  const handleApplyHighlight = async (color: HighlightColor, note?: string) => {
    if (!activeSelection) return;

    sounds.playScanSuccess();
    const newHighlight: EpubHighlight = {
      id: activeSelection.existingHighlight?.id || `hl-${Date.now()}`,
      cfiRange: activeSelection.cfiRange,
      text: activeSelection.text,
      color,
      note,
      chapterTitle: currentChapterTitle || undefined,
      createdAt: new Date().toISOString(),
    };

    await epubStorage.saveHighlight(book.id, newHighlight);
    await refreshUserData();

    // Re-render highlight on rendition
    if (renditionRef.current) {
      try {
        const colorDef = HighlightingColors[color];
        renditionRef.current.annotations.highlight(
          newHighlight.cfiRange,
          {},
          (e: MouseEvent) => {
            e.stopPropagation();
            const rect = (e.target as HTMLElement)?.getBoundingClientRect();
            setActiveSelection({
              cfiRange: newHighlight.cfiRange,
              text: newHighlight.text,
              position: {
                top: (rect?.top || 100) - 60,
                left: (rect?.left || window.innerWidth / 2) + (rect?.width || 0) / 2,
              },
              existingHighlight: newHighlight,
            });
          },
          'custom-epub-highlight',
          {
            fill: colorDef.fillHex,
            'fill-opacity': '0.35',
            'mix-blend-mode': 'multiply',
          }
        );
      } catch {}
    }

    setActiveSelection(null);
  };

  const handleRemoveHighlight = async (highlightId: string) => {
    const hl = highlights.find((h) => h.id === highlightId);
    if (hl && renditionRef.current) {
      try {
        renditionRef.current.annotations.remove(hl.cfiRange, 'highlight');
      } catch {}
    }

    await epubStorage.deleteHighlight(highlightId);
    await refreshUserData();
    setActiveSelection(null);
  };

  const handleUpdateHighlightNote = async (id: string, newNote: string) => {
    const target = highlights.find((h) => h.id === id);
    if (!target) return;
    const updated = { ...target, note: newNote.trim() || undefined };
    await epubStorage.saveHighlight(book.id, updated);
    await refreshUserData();
  };

  // --- BOOKMARK ACTIONS ---
  const isCurrentLocationBookmarked = bookmarks.some(
    (b) => b.cfi === currentCfi || Math.abs(b.percentage - progressPercentage) < 0.5
  );

  const handleToggleBookmark = async () => {
    if (!currentCfi) return;

    if (isCurrentLocationBookmarked) {
      const match = bookmarks.find((b) => b.cfi === currentCfi);
      if (match) {
        await epubStorage.deleteBookmark(match.id);
      }
    } else {
      sounds.playScanSuccess();
      const newBm: EpubBookmark = {
        id: `bm-${Date.now()}`,
        cfi: currentCfi,
        label: `${currentChapterTitle || 'Page'} (${progressPercentage}%)`,
        percentage: progressPercentage,
        chapterTitle: currentChapterTitle,
        createdAt: new Date().toISOString(),
      };
      await epubStorage.saveBookmark(book.id, newBm);
    }
    await refreshUserData();
  };

  // --- NAVIGATION HELPERS ---
  const handleJumpToCfi = (cfi: string) => {
    sounds.playPageFlip();
    renditionRef.current?.display(cfi);
  };

  const handleNavigateHref = (href: string) => {
    sounds.playPageFlip();
    renditionRef.current?.display(href);
  };

  if (!isOpen) return null;

  const currentThemeConfig = READER_THEMES[settings.theme];

  return (
    <div
      id="epub-reader-modal"
      className="fixed inset-0 z-50 flex flex-col select-none overflow-hidden animate-in fade-in duration-200"
      style={{ backgroundColor: currentThemeConfig.bg, color: currentThemeConfig.text }}
      onClick={() => {
        if (activeSelection) setActiveSelection(null);
      }}
    >
      {/* 1. TOP MOBILE & DESKTOP HUD BAR */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${
          isHudVisible ? 'translate-y-0' : '-translate-y-full'
        } ${currentThemeConfig.hudBg} backdrop-blur-md border-b`}
        style={{ borderColor: currentThemeConfig.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          {/* Left: Back button & Book Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => {
                sounds.playPageFlip();
                onClose();
              }}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="Close Reader"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Library</span>
            </button>

            <div className="min-w-0 pl-1 border-l border-black/10 dark:border-white/10">
              <h2 className="font-serif font-bold text-xs sm:text-sm truncate max-w-[160px] sm:max-w-xs md:max-w-md">
                {book.title}
              </h2>
              {currentChapterTitle && (
                <p className="text-[10px] opacity-75 truncate max-w-[140px] sm:max-w-xs">
                  {currentChapterTitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions (Bookmark, Highlights, TOC, Settings, Fullscreen) */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Bookmark */}
            <button
              onClick={handleToggleBookmark}
              className={`p-2 rounded-full transition cursor-pointer ${
                isCurrentLocationBookmarked
                  ? 'bg-[#5A5A40] text-white shadow-sm'
                  : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-80 hover:opacity-100'
              }`}
              title={isCurrentLocationBookmarked ? 'Bookmarked' : 'Add Bookmark'}
            >
              {isCurrentLocationBookmarked ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>

            {/* Dictionary */}
            <button
              onClick={() => {
                setDictWord('');
                setIsDictionaryOpen(true);
              }}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              title="Dictionary (English to Traditional Chinese)"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Highlights Drawer Trigger */}
            <button
              onClick={() => setIsHighlightsOpen(true)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer relative"
              title="View Highlights & Notes"
            >
              <Highlighter className="w-4 h-4" />
              {highlights.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#5A5A40] text-white text-[9px] font-bold flex items-center justify-center">
                  {highlights.length}
                </span>
              )}
            </button>

            {/* Table of Contents */}
            <button
              onClick={() => setIsTocOpen(true)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              title="Table of Contents"
            >
              <List className="w-4 h-4" />
            </button>

            {/* Appearance Settings */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              title="Typography & Theme Settings"
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Quick Day/Night Toggle */}
            <button
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  theme: s.theme === 'dark' || s.theme === 'oled' ? 'parchment' : 'dark',
                }))
              }
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer hidden sm:flex"
              title="Toggle Day/Night"
            >
              {settings.theme === 'dark' || settings.theme === 'oled' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN EPUB READING STAGE */}
      <div className="flex-1 relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-inherit">
            <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
            <p className="text-xs font-medium opacity-80">{loadingStatus}</p>
          </div>
        )}

        {/* Load Error State */}
        {loadError && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-inherit">
            <p className="text-sm font-semibold text-rose-600">{loadError}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-[#5A5A40] text-white"
            >
              Return to Library
            </button>
          </div>
        )}

        {/* Desktop Side Page Turn Click Targets */}
        <button
          onClick={() => {
            sounds.playPageFlip();
            renditionRef.current?.prev();
          }}
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 items-center justify-center transition opacity-40 hover:opacity-100 cursor-pointer backdrop-blur-sm"
          title="Previous Page"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={() => {
            sounds.playPageFlip();
            renditionRef.current?.next();
          }}
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 items-center justify-center transition opacity-40 hover:opacity-100 cursor-pointer backdrop-blur-sm"
          title="Next Page"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* EPUB Render Container */}
        <div
          ref={viewerContainerRef}
          className="w-full h-full max-w-4xl mx-auto px-2 sm:px-6 pt-14 pb-16 flex items-center justify-center"
          style={{ minHeight: '100%' }}
        />

        {/* Text Selection Highlight Menu */}
        {activeSelection && (
          <HighlightMenu
            position={activeSelection.position}
            selectedText={activeSelection.text}
            cfiRange={activeSelection.cfiRange}
            existingHighlight={activeSelection.existingHighlight}
            onApplyHighlight={handleApplyHighlight}
            onRemoveHighlight={handleRemoveHighlight}
            onClose={() => setActiveSelection(null)}
            onLookup={(word) => {
              setActiveSelection(null);
              setDictWord(word);
              setIsDictionaryOpen(true);
            }}
          />
        )}
      </div>

      {/* 3. BOTTOM MOBILE & DESKTOP READING HUD */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
          isHudVisible ? 'translate-y-0' : 'translate-y-full'
        } ${currentThemeConfig.hudBg} backdrop-blur-md border-t`}
        style={{ borderColor: currentThemeConfig.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 space-y-2">
          {/* Reading Progress Slider */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sounds.playPageFlip();
                renditionRef.current?.prev();
              }}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer md:hidden"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <input
              type="range"
              min={0}
              max={100}
              value={progressPercentage}
              onChange={(e) => {
                const targetPct = Number(e.target.value);
                setProgressPercentage(targetPct);
                if (bookInstanceRef.current?.locations) {
                  try {
                    const cfi = bookInstanceRef.current.locations.cfiFromPercentage(targetPct / 100);
                    if (cfi) renditionRef.current?.display(cfi);
                  } catch {}
                }
              }}
              className="flex-1 accent-[#5A5A40] cursor-pointer h-1.5 rounded-lg bg-black/10 dark:bg-white/20"
            />

            <button
              onClick={() => {
                sounds.playPageFlip();
                renditionRef.current?.next();
              }}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer md:hidden"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Reading Stats Footer row */}
          <div className="flex items-center justify-between text-[11px] opacity-75 font-mono">
            <span className="truncate max-w-[200px]">
              {currentChapterTitle || 'Chapter Navigation'}
            </span>
            <span className="font-semibold">{progressPercentage}% read</span>
          </div>
        </div>
      </div>

      {/* Floating Center Tap Hint on First Load */}
      <div
        onClick={() => setIsHudVisible(!isHudVisible)}
        className="fixed bottom-2 left-1/2 -translate-x-1/2 z-10 opacity-30 hover:opacity-75 transition text-[10px] text-center cursor-pointer pointer-events-auto select-none"
      >
        Tap center to toggle controls
      </div>

      {/* 4. MODALS & DRAWERS */}
      <HighlightsDrawer
        isOpen={isHighlightsOpen}
        onClose={() => setIsHighlightsOpen(false)}
        highlights={highlights}
        bookTitle={book.title}
        onJumpToCfi={handleJumpToCfi}
        onDeleteHighlight={handleRemoveHighlight}
        onUpdateHighlightNote={handleUpdateHighlightNote}
      />

      <TocBookmarksDrawer
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        toc={toc}
        bookmarks={bookmarks}
        currentCfi={currentCfi}
        onNavigateHref={handleNavigateHref}
        onNavigateCfi={handleJumpToCfi}
        onDeleteBookmark={async (id) => {
          await epubStorage.deleteBookmark(id);
          refreshUserData();
        }}
      />

      <ReaderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings((s) => ({ ...s, ...newSettings }))}
      />

      <DictionaryPanel
        bookId={book.id}
        isOpen={isDictionaryOpen}
        onClose={() => setIsDictionaryOpen(false)}
        initialWord={dictWord}
      />
    </div>
  );
};
