import { Book, ReadingStatus } from '../types';

// Preset rich spine palettes for stylish 3D book generation
const SPINE_PALETTES = [
  { spine: '#1e3a8a', accent: '#fbbf24' }, // Navy & Gold
  { spine: '#831843', accent: '#fbcfe8' }, // Deep Crimson & Rose
  { spine: '#064e3b', accent: '#a7f3d0' }, // Forest Emerald & Mint
  { spine: '#4c1d95', accent: '#c4b5fd' }, // Royal Violet & Lavender
  { spine: '#7c2d12', accent: '#fed7aa' }, // Mahogany & Amber
  { spine: '#18181b', accent: '#e4e4e7' }, // Obsidian & Silver
  { spine: '#0e7490', accent: '#bae6fd' }, // Ocean Cyan & Aqua
  { spine: '#9a3412', accent: '#ffedd5' }, // Terracotta & Cream
  { spine: '#312e81', accent: '#e0e7ff' }, // Indigo & Soft Blue
  { spine: '#365314', accent: '#ecfccb' }, // Olive Moss & Lime
];

export function getRandomSpinePalette(seed: string = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % SPINE_PALETTES.length;
  return SPINE_PALETTES[index];
}

export function cleanISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, '').trim();
}

export interface FetchBookResult {
  book: Partial<Book>;
  source: 'google' | 'openlibrary' | 'fallback';
}

export async function fetchBookByISBN(rawIsbn: string): Promise<FetchBookResult> {
  const isbn = cleanISBN(rawIsbn);
  if (!isbn) {
    throw new Error('Please enter a valid ISBN.');
  }

  // 1. Try Google Books API first
  try {
    const googleRes = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`
    );

    if (googleRes.ok) {
      const data = await googleRes.json();
      if (data.totalItems > 0 && data.items && data.items.length > 0) {
        const item = data.items[0];
        const volumeInfo = item.volumeInfo || {};

        let coverUrl =
          volumeInfo.imageLinks?.extraLarge ||
          volumeInfo.imageLinks?.large ||
          volumeInfo.imageLinks?.medium ||
          volumeInfo.imageLinks?.thumbnail ||
          volumeInfo.imageLinks?.smallThumbnail ||
          `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;

        // Upgrade google book image URLs to HTTPS and high quality
        if (coverUrl.startsWith('http://')) {
          coverUrl = coverUrl.replace('http://', 'https://');
        }
        if (coverUrl.includes('&edge=curl')) {
          coverUrl = coverUrl.replace('&edge=curl', '');
        }

        const title = volumeInfo.title || 'Untitled Book';
        const palette = getRandomSpinePalette(title + isbn);

        const book: Partial<Book> = {
          isbn,
          title,
          authors: volumeInfo.authors || ['Unknown Author'],
          description: volumeInfo.description || 'No synopsis available.',
          coverUrl,
          thumbnailUrl: volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://') || coverUrl,
          pageCount: volumeInfo.pageCount || 280,
          publishedDate: volumeInfo.publishedDate || 'Unknown',
          publisher: volumeInfo.publisher || 'Independent Publisher',
          categories: volumeInfo.categories || ['General Fiction'],
          language: volumeInfo.language?.toUpperCase() || 'EN',
          spineColor: palette.spine,
          accentColor: palette.accent,
        };

        return { book, source: 'google' };
      }
    }
  } catch (err) {
    console.warn('Google Books API lookup failed, trying OpenLibrary...', err);
  }

  // 2. Fallback: Open Library Data API
  try {
    const olRes = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`
    );

    if (olRes.ok) {
      const olData = await olRes.json();
      const key = `ISBN:${isbn}`;
      if (olData[key]) {
        const item = olData[key];
        const title = item.title || 'Untitled Book';
        const authors = item.authors ? item.authors.map((a: { name: string }) => a.name) : ['Unknown Author'];
        const coverUrl = item.cover?.large || item.cover?.medium || `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        const categories = item.subjects ? item.subjects.slice(0, 3).map((s: { name: string }) => s.name) : ['General'];
        const palette = getRandomSpinePalette(title + isbn);

        const book: Partial<Book> = {
          isbn,
          title,
          authors,
          description: typeof item.notes === 'string' ? item.notes : 'Synced from Open Library database.',
          coverUrl,
          pageCount: item.number_of_pages || 250,
          publishedDate: item.publish_date || 'Unknown',
          publisher: item.publishers ? item.publishers[0]?.name : 'Unknown Publisher',
          categories,
          language: 'EN',
          spineColor: palette.spine,
          accentColor: palette.accent,
        };

        return { book, source: 'openlibrary' };
      }
    }
  } catch (err) {
    console.warn('Open Library API lookup failed', err);
  }

  // 3. Fallback: Direct Open Library ISBN JSON
  try {
    const directOlRes = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`);
    if (directOlRes.ok) {
      const item = await directOlRes.json();
      const title = item.title || 'Unknown Title';
      const palette = getRandomSpinePalette(title + isbn);

      const book: Partial<Book> = {
        isbn,
        title,
        authors: ['Cataloged Author'],
        description: typeof item.description === 'string' ? item.description : item.description?.value || 'Added via Open Library ISBN catalog.',
        coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
        pageCount: item.number_of_pages || 200,
        publishedDate: item.publish_date || 'Unknown',
        publisher: item.publishers ? item.publishers[0] : 'Open Library Registry',
        categories: ['Literature'],
        language: 'EN',
        spineColor: palette.spine,
        accentColor: palette.accent,
      };

      return { book, source: 'openlibrary' };
    }
  } catch (err) {
    console.warn('Direct Open Library fallback failed', err);
  }

  throw new Error(`Could not find book details for ISBN: ${isbn}. You can still add it manually!`);
}

export function createNewBookRecord(data: Partial<Book>, initialShelf: string = 'General'): Book {
  const palette = getRandomSpinePalette((data.title || '') + (data.isbn || ''));
  const pageCount = data.pageCount && data.pageCount > 0 ? data.pageCount : 250;
  const status: ReadingStatus = data.status || 'to-read';

  return {
    id: data.id || `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    isbn: data.isbn ? cleanISBN(data.isbn) : '9780000000000',
    title: data.title || 'Untitled Book',
    authors: data.authors && data.authors.length > 0 ? data.authors : ['Unknown Author'],
    description: data.description || 'No description provided.',
    coverUrl: data.coverUrl || '',
    thumbnailUrl: data.thumbnailUrl || data.coverUrl || '',
    pageCount,
    publishedDate: data.publishedDate || new Date().getFullYear().toString(),
    publisher: data.publisher || 'Independent',
    categories: data.categories && data.categories.length > 0 ? data.categories : ['Bookshelf'],
    language: data.language || 'EN',
    status,
    rating: data.rating ?? 0,
    progressPages: data.progressPages ?? 0,
    shelf: data.shelf || initialShelf,
    notes: data.notes || [],
    quotes: data.quotes || [],
    lentTo: data.lentTo || null,
    addedAt: data.addedAt || new Date().toISOString(),
    spineColor: data.spineColor || palette.spine,
    accentColor: data.accentColor || palette.accent,
    isFavorite: Boolean(data.isFavorite),
    finishDate: data.finishDate,
  };
}
