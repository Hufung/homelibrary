import * as pdfjsLib from 'pdfjs-dist';
import ePub from 'epubjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const TARGET_WIDTH = 480;

const downscaleCanvas = (source: HTMLCanvasElement, maxWidth: number): string => {
  const ratio = maxWidth / source.width;
  if (ratio >= 1) {
    return source.toDataURL('image/jpeg', 0.85);
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * ratio);
  canvas.height = Math.round(source.height * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) return source.toDataURL('image/jpeg', 0.85);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
};

export const generatePdfFirstPageCover = async (file: File | ArrayBuffer): Promise<string | null> => {
  try {
    const data = file instanceof File ? await file.arrayBuffer() : file;
    const loadingTask = pdfjsLib.getDocument({ data: data.slice(0) });
    const pdf = await loadingTask.promise;
    if (pdf.numPages < 1) return null;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const renderScale = Math.max(1, TARGET_WIDTH / baseViewport.width);
    const viewport = page.getViewport({ scale: renderScale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await page.render({ canvas, canvasContext: ctx, viewport } as any).promise;
    const dataUrl = downscaleCanvas(canvas, TARGET_WIDTH);
    return dataUrl;
  } catch (e) {
    console.warn('Failed to generate PDF first-page cover:', e);
    return null;
  }
};

export const generateEpubFirstPageCover = async (file: File | ArrayBuffer): Promise<string | null> => {
  try {
    const buf = file instanceof File ? await file.arrayBuffer() : file;
    const book = ePub(buf);
    await book.ready;
    const coverUrl: string | undefined = await book.coverUrl().catch(() => undefined);
    if (!coverUrl) {
      try { book.destroy(); } catch {}
      return null;
    }
    const response = await fetch(coverUrl);
    const blob = await response.blob();
    const img = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    try { book.destroy(); } catch {}
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return downscaleCanvas(canvas, TARGET_WIDTH);
  } catch (e) {
    console.warn('Failed to generate EPUB cover:', e);
    return null;
  }
};
