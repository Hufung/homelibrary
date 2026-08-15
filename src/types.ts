export type ReadingStatus = 'reading' | 'to-read' | 'completed' | 'wishlist';

export interface BookNote {
  id: string;
  date: string;
  content: string;
  page?: number;
}

export interface LentRecord {
  name: string;
  date: string;
  expectedReturn?: string;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export interface EpubHighlight {
  id: string;
  cfiRange: string;
  text: string;
  color: HighlightColor;
  note?: string;
  chapterTitle?: string;
  createdAt: string;
}

export interface EpubBookmark {
  id: string;
  cfi: string;
  label: string;
  percentage: number;
  chapterTitle?: string;
  createdAt: string;
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  authors: string[];
  description: string;
  coverUrl: string;
  thumbnailUrl?: string;
  pageCount: number;
  publishedDate: string;
  publisher: string;
  categories: string[];
  language: string;
  status: ReadingStatus;
  rating: number; // 0 to 5
  progressPages: number;
  shelf: string;
  notes: BookNote[];
  quotes: string[];
  lentTo?: LentRecord | null;
  addedAt: string;
  spineColor: string;
  accentColor: string;
  isFavorite: boolean;
  finishDate?: string;
  // EPUB Integration
  hasEpub?: boolean;
  epubFileName?: string;
  epubFileSize?: number;
  lastReadCfi?: string;
  readingPercentage?: number;
}

export type ViewMode = 'bookshelf-3d' | 'grid-3d' | 'compact-table';

export interface FilterOptions {
  search: string;
  status: ReadingStatus | 'all';
  shelf: string | 'all';
  sortBy: 'addedAt' | 'title' | 'author' | 'rating' | 'progress' | 'pageCount';
  sortDirection: 'asc' | 'desc';
  favoritesOnly: boolean;
  epubOnly?: boolean;
}

export type ReaderThemeMode = 'parchment' | 'sepia' | 'white' | 'dark' | 'oled';

export interface ReaderSettings {
  fontSize: number; // in px or %
  fontFamily: 'serif' | 'sans' | 'merriweather' | 'dyslexic';
  lineHeight: number;
  theme: ReaderThemeMode;
  spread: 'auto' | 'none'; // 'none' for mobile single page, 'auto' for 2-column on wide screens
  margin: number;
}
