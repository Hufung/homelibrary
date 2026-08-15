import { EpubHighlight, EpubBookmark } from '../types';

const DB_NAME = 'BibliothecaEpubDB';
const DB_VERSION = 1;

const STORES = {
  FILES: 'epub_files',
  HIGHLIGHTS: 'epub_highlights',
  BOOKMARKS: 'epub_bookmarks',
  LOCATIONS: 'epub_locations',
} as const;

class EpubStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this browser'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for raw EPUB file buffers
        if (!db.objectStoreNames.contains(STORES.FILES)) {
          db.createObjectStore(STORES.FILES, { keyPath: 'bookId' });
        }

        // Store for highlights
        if (!db.objectStoreNames.contains(STORES.HIGHLIGHTS)) {
          const hlStore = db.createObjectStore(STORES.HIGHLIGHTS, { keyPath: 'id' });
          hlStore.createIndex('bookId', 'bookId', { unique: false });
        }

        // Store for bookmarks
        if (!db.objectStoreNames.contains(STORES.BOOKMARKS)) {
          const bmStore = db.createObjectStore(STORES.BOOKMARKS, { keyPath: 'id' });
          bmStore.createIndex('bookId', 'bookId', { unique: false });
        }

        // Store for last read location
        if (!db.objectStoreNames.contains(STORES.LOCATIONS)) {
          db.createObjectStore(STORES.LOCATIONS, { keyPath: 'bookId' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // --- EPUB File Storage ---
  async saveEpubFile(bookId: string, fileData: ArrayBuffer | Blob | File, fileName: string): Promise<number> {
    const db = await this.getDB();
    let buffer: ArrayBuffer;

    if (fileData instanceof ArrayBuffer) {
      buffer = fileData;
    } else {
      buffer = await fileData.arrayBuffer();
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FILES], 'readwrite');
      const store = transaction.objectStore(STORES.FILES);

      const record = {
        bookId,
        data: buffer,
        fileName,
        size: buffer.byteLength,
        uploadedAt: new Date().toISOString(),
      };

      const req = store.put(record);
      req.onsuccess = () => resolve(buffer.byteLength);
      req.onerror = () => reject(req.error);
    });
  }

  async getEpubFile(bookId: string): Promise<ArrayBuffer | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FILES], 'readonly');
      const store = transaction.objectStore(STORES.FILES);
      const req = store.get(bookId);

      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve(req.result.data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async hasEpubFile(bookId: string): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FILES], 'readonly');
      const store = transaction.objectStore(STORES.FILES);
      const req = store.count(IDBKeyRange.only(bookId));

      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteEpubFile(bookId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FILES], 'readwrite');
      const store = transaction.objectStore(STORES.FILES);
      const req = store.delete(bookId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- Highlights Management ---
  async saveHighlight(bookId: string, highlight: EpubHighlight): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.HIGHLIGHTS], 'readwrite');
      const store = transaction.objectStore(STORES.HIGHLIGHTS);
      const record = {
        ...highlight,
        bookId,
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getHighlights(bookId: string): Promise<EpubHighlight[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.HIGHLIGHTS], 'readonly');
      const store = transaction.objectStore(STORES.HIGHLIGHTS);
      const index = store.index('bookId');
      const req = index.getAll(bookId);

      req.onsuccess = () => {
        const results = req.result || [];
        resolve(
          results.map(({ id, cfiRange, text, color, note, chapterTitle, createdAt }) => ({
            id,
            cfiRange,
            text,
            color,
            note,
            chapterTitle,
            createdAt,
          }))
        );
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteHighlight(highlightId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.HIGHLIGHTS], 'readwrite');
      const store = transaction.objectStore(STORES.HIGHLIGHTS);
      const req = store.delete(highlightId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async updateHighlight(bookId: string, highlight: EpubHighlight): Promise<void> {
    return this.saveHighlight(bookId, highlight);
  }

  // --- Bookmarks ---
  async saveBookmark(bookId: string, bookmark: EpubBookmark): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.BOOKMARKS], 'readwrite');
      const store = transaction.objectStore(STORES.BOOKMARKS);
      const record = {
        ...bookmark,
        bookId,
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getBookmarks(bookId: string): Promise<EpubBookmark[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.BOOKMARKS], 'readonly');
      const store = transaction.objectStore(STORES.BOOKMARKS);
      const index = store.index('bookId');
      const req = index.getAll(bookId);

      req.onsuccess = () => {
        const results = req.result || [];
        resolve(
          results.map(({ id, cfi, label, percentage, chapterTitle, createdAt }) => ({
            id,
            cfi,
            label,
            percentage,
            chapterTitle,
            createdAt,
          }))
        );
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteBookmark(bookmarkId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.BOOKMARKS], 'readwrite');
      const store = transaction.objectStore(STORES.BOOKMARKS);
      const req = store.delete(bookmarkId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- Reading Position ---
  async saveReadingLocation(bookId: string, cfi: string, percentage: number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.LOCATIONS], 'readwrite');
      const store = transaction.objectStore(STORES.LOCATIONS);
      const record = {
        bookId,
        cfi,
        percentage,
        updatedAt: new Date().toISOString(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getReadingLocation(bookId: string): Promise<{ cfi: string; percentage: number } | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.LOCATIONS], 'readonly');
      const store = transaction.objectStore(STORES.LOCATIONS);
      const req = store.get(bookId);

      req.onsuccess = () => {
        if (req.result) {
          resolve({
            cfi: req.result.cfi,
            percentage: req.result.percentage || 0,
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }
}

export const epubStorage = new EpubStorageService();
