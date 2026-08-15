import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Book, ReadingStatus } from '../types';
import { fetchBookByISBN, createNewBookRecord, cleanISBN } from '../services/bookFetcher';
import { POPULAR_ISBN_PRESETS } from '../data/sampleBooks';
import { Book3D } from './Book3D';
import { sounds } from '../services/soundEffects';
import {
  X,
  Camera,
  Search,
  Upload,
  Sparkles,
  Check,
  AlertCircle,
  RotateCw,
  Layers,
  BookPlus,
  Zap,
} from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBook: (newBook: Book) => void;
  existingShelves: string[];
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onAddBook,
  existingShelves,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'upload'>('camera');
  const [isbnInput, setIsbnInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchedBook, setFetchedBook] = useState<Partial<Book> | null>(null);
  
  // Customizable fields before saving
  const [selectedShelf, setSelectedShelf] = useState(existingShelves[0] || 'General');
  const [newShelfName, setNewShelfName] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ReadingStatus>('to-read');
  const [batchMode, setBatchMode] = useState(false);
  const [batchCount, setBatchCount] = useState(0);

  // Camera scanner states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'reader-container';

  // Handle active camera scanning
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopCamera();
      return;
    }

    let isMounted = true;

    async function initCamera() {
      try {
        setCameraError(null);
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back / environment camera
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment')
          );
          const chosenId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(chosenId);
          startCameraScanner(chosenId);
        } else {
          setCameraError('No camera detected on this device.');
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Camera permission denied or unavailable';
        setCameraError(msg);
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const startCameraScanner = async (cameraId: string) => {
    try {
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          handleScannedISBN(decodedText);
        },
        () => {
          // Frame scan pass without hit
        }
      );

      setIsCameraActive(true);
      setCameraError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to launch camera stream.';
      setCameraError(msg);
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch {
      // Ignore stop errors
    } finally {
      html5QrCodeRef.current = null;
      setIsCameraActive(false);
    }
  };

  const handleScannedISBN = async (code: string) => {
    const clean = cleanISBN(code);
    if (clean.length < 8) return;

    sounds.playScanSuccess();
    if (!batchMode) {
      stopCamera();
    }
    await performFetch(clean);
  };

  const performFetch = async (isbn: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setFetchedBook(null);

    try {
      const result = await fetchBookByISBN(isbn);
      setFetchedBook(result.book);
      setIsbnInput(isbn);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not fetch book details.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isbnInput.trim()) return;
    performFetch(isbnInput);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const html5QrCode = new Html5Qrcode('file-scanner-temp');
      const decodedText = await html5QrCode.scanFile(file, true);
      sounds.playScanSuccess();
      await performFetch(decodedText);
    } catch {
      setErrorMessage('Could not find a valid barcode in that photo. Please try a clearer picture or enter ISBN manually.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBook = () => {
    if (!fetchedBook) return;

    const shelf = newShelfName.trim() || selectedShelf;
    const bookToAdd = createNewBookRecord(
      {
        ...fetchedBook,
        shelf,
        status: selectedStatus,
        progressPages: selectedStatus === 'completed' ? (fetchedBook.pageCount || 250) : 0,
      },
      shelf
    );

    sounds.playBookThud();
    onAddBook(bookToAdd);
    setBatchCount((prev) => prev + 1);

    if (batchMode) {
      // Clear current preview and restart camera for next book
      setFetchedBook(null);
      setIsbnInput('');
      if (selectedCameraId) {
        startCameraScanner(selectedCameraId);
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="isbn-scanner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Hidden container for file barcode scanner */}
      <div id="file-scanner-temp" className="hidden" />

      <div className="relative w-full max-w-2xl bg-[#F9F7F2] border border-[#D9D1C2] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-[#3D3A35]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE4D9] bg-[#F5F2ED]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#EAE4D9] border border-[#D9D1C2] flex items-center justify-center text-[#5A5A40]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#2C2C2C] text-lg">Scan & Fetch Book ISBN</h3>
              <p className="text-xs text-[#8C867A]">Add physical books to your 3D shelf via barcode or ISBN</p>
            </div>
          </div>

          <button
            id="close-scanner-btn"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-full text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#EAE4D9] bg-[#F5F2ED]/60 px-6 pt-3 gap-2">
          <button
            id="tab-camera"
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'camera'
                ? 'border-[#5A5A40] text-[#5A5A40]'
                : 'border-transparent text-[#8C867A] hover:text-[#2C2C2C]'
            }`}
          >
            <Camera className="w-4 h-4" />
            Live Camera Barcode
          </button>

          <button
            id="tab-manual"
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'manual'
                ? 'border-[#5A5A40] text-[#5A5A40]'
                : 'border-transparent text-[#8C867A] hover:text-[#2C2C2C]'
            }`}
          >
            <Search className="w-4 h-4" />
            Manual ISBN / Presets
          </button>

          <button
            id="tab-upload"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'upload'
                ? 'border-[#5A5A40] text-[#5A5A40]'
                : 'border-transparent text-[#8C867A] hover:text-[#2C2C2C]'
            }`}
          >
            <Upload className="w-4 h-4" />
            Photo Barcode Upload
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#F9F7F2]">
          {/* CAMERA TAB */}
          {activeTab === 'camera' && !fetchedBook && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-[#D9D1C2] aspect-video flex items-center justify-center shadow-inner">
                <div id={scannerContainerId} className="w-full h-full" />

                {/* Laser animation overlay */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center">
                    <div className="relative w-64 h-36 border-2 border-dashed border-[#5A5A40] rounded-xl">
                      <div className="absolute left-0 right-0 h-0.5 bg-[#5A5A40] scanner-laser shadow-[0_0_8px_#5a5a40]" />
                      <span className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-white font-medium drop-shadow">
                        Align book barcode inside frame
                      </span>
                    </div>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 bg-[#F9F7F2]/95 flex flex-col items-center justify-center p-6 text-center text-[#3D3A35] space-y-3">
                    <AlertCircle className="w-8 h-8 text-[#7D5A50]" />
                    <p className="text-sm font-medium">{cameraError}</p>
                    <button
                      onClick={() => setActiveTab('manual')}
                      className="px-5 py-2.5 bg-[#5A5A40] hover:bg-[#4A4A34] text-white text-xs font-semibold rounded-full shadow cursor-pointer"
                    >
                      Use Manual ISBN Lookup Instead
                    </button>
                  </div>
                )}
              </div>

              {/* Camera selection & Batch mode toggle */}
              <div className="flex items-center justify-between text-xs text-[#8C867A]">
                {cameras.length > 1 && (
                  <div className="flex items-center gap-2">
                    <RotateCw className="w-3.5 h-3.5" />
                    <select
                      value={selectedCameraId}
                      onChange={(e) => {
                        setSelectedCameraId(e.target.value);
                        startCameraScanner(e.target.value);
                      }}
                      className="bg-[#FFFFFF] text-[#2C2C2C] border border-[#D9D1C2] rounded-lg px-2.5 py-1 text-xs outline-none"
                    >
                      {cameras.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label || `Camera ${c.id.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer ml-auto">
                  <input
                    type="checkbox"
                    checked={batchMode}
                    onChange={(e) => setBatchMode(e.target.checked)}
                    className="accent-[#5A5A40] rounded"
                  />
                  <span className="text-[#3D3A35] font-medium flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-[#5A5A40]" />
                    Continuous Batch Scan {batchCount > 0 && `(${batchCount} added)`}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* MANUAL SEARCH TAB */}
          {activeTab === 'manual' && !fetchedBook && (
            <div className="space-y-6">
              <form onSubmit={handleManualSearch} className="space-y-3">
                <label className="block text-xs font-semibold text-[#5A5A40] uppercase tracking-wider">
                  Enter 10 or 13-Digit ISBN
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 9780735211292 or 0441013597"
                    value={isbnInput}
                    onChange={(e) => setIsbnInput(e.target.value)}
                    className="flex-1 bg-[#FFFFFF] border border-[#D9D1C2] focus:border-[#5A5A40] rounded-xl px-4 py-3 text-sm text-[#2C2C2C] placeholder:text-[#A69F92] outline-none font-mono shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !isbnInput.trim()}
                    className="px-6 py-3 bg-[#5A5A40] hover:bg-[#4A4A34] disabled:opacity-50 text-white font-semibold text-xs rounded-full flex items-center gap-2 transition cursor-pointer shadow-md"
                  >
                    {isLoading ? (
                      <RotateCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Fetch Book
                  </button>
                </div>
              </form>

              {/* Popular ISBN Presets for Quick Testing */}
              <div>
                <span className="text-xs text-[#8C867A] block mb-2 font-medium">
                  Try Quick Popular Bookshelf Presets:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {POPULAR_ISBN_PRESETS.map((preset) => (
                    <button
                      key={preset.isbn}
                      onClick={() => {
                        setIsbnInput(preset.isbn);
                        performFetch(preset.isbn);
                      }}
                      className="text-left p-3 rounded-xl bg-[#F5F2ED] hover:bg-[#FFFFFF] border border-[#D9D1C2] hover:border-[#5A5A40]/50 transition group shadow-sm cursor-pointer"
                    >
                      <p className="text-xs font-serif font-bold text-[#2C2C2C] group-hover:text-[#5A5A40] truncate">
                        {preset.name}
                      </p>
                      <p className="text-[10px] text-[#8C867A] truncate mt-0.5">{preset.author}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* UPLOAD TAB */}
          {activeTab === 'upload' && !fetchedBook && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-[#D9D1C2] hover:border-[#5A5A40] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-[#F5F2ED]/60 hover:bg-[#F5F2ED] transition group">
                <div className="w-12 h-12 rounded-full bg-[#EAE4D9] group-hover:bg-[#5A5A40] text-[#5A5A40] group-hover:text-white flex items-center justify-center mb-3 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-[#2C2C2C] group-hover:text-[#5A5A40]">
                  Upload Book Barcode Photo
                </span>
                <span className="text-xs text-[#8C867A] mt-1">
                  Supports JPEG, PNG, WEBP with ISBN barcode
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* LOADING STATE */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#5A5A40] font-medium">
                Fetching book metadata & cover from ISBN database...
              </p>
            </div>
          )}

          {/* ERROR STATE */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-[#7D5A50]/10 border border-[#7D5A50]/30 text-[#7D5A50] text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#7D5A50]" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* FETCHED BOOK 3D PREVIEW & SHELF CONFIGURATION */}
          {fetchedBook && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="p-5 rounded-2xl bg-[#F5F2ED] border border-[#D9D1C2] flex flex-col sm:flex-row items-center gap-6 shadow-sm">
                {/* 3D Preview Box */}
                <div className="flex justify-center flex-shrink-0">
                  <Book3D
                    book={createNewBookRecord(fetchedBook)}
                    size="md"
                    interactive={true}
                  />
                </div>

                {/* Metadata Details */}
                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#5A5A40] px-2.5 py-0.5 rounded-full bg-[#EAE4D9] border border-[#D9D1C2] inline-block">
                    ISBN: {fetchedBook.isbn}
                  </span>
                  <h4 className="font-serif font-bold text-lg text-[#2C2C2C] leading-snug">
                    {fetchedBook.title}
                  </h4>
                  <p className="text-xs text-[#8C867A] font-medium">
                    by {fetchedBook.authors?.join(', ')}
                  </p>
                  <p className="text-xs text-[#3D3A35] line-clamp-3 leading-relaxed pt-1">
                    {fetchedBook.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8C867A] pt-2">
                    <span>{fetchedBook.pageCount} Pages</span>
                    <span>•</span>
                    <span>{fetchedBook.publisher}</span>
                    <span>•</span>
                    <span>{fetchedBook.publishedDate}</span>
                  </div>
                </div>
              </div>

              {/* Shelf & Reading Status Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F5F2ED] p-4 rounded-2xl border border-[#D9D1C2]">
                {/* Shelf Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#5A5A40] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#5A5A40]" />
                    Place on Shelf:
                  </label>
                  <select
                    value={selectedShelf}
                    onChange={(e) => setSelectedShelf(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D9D1C2] rounded-xl px-3 py-2 text-xs text-[#2C2C2C] outline-none"
                  >
                    {existingShelves.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or create new shelf name..."
                    value={newShelfName}
                    onChange={(e) => setNewShelfName(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D9D1C2] rounded-xl px-3 py-2 text-xs text-[#2C2C2C] placeholder:text-[#A69F92] outline-none"
                  />
                </div>

                {/* Status Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#5A5A40]">
                    Reading Status:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['to-read', 'reading', 'completed'] as ReadingStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSelectedStatus(st)}
                        className={`py-2 px-1 text-[11px] font-semibold rounded-full border capitalize transition cursor-pointer ${
                          selectedStatus === st
                            ? 'bg-[#5A5A40] border-[#5A5A40] text-white'
                            : 'bg-[#FFFFFF] border-[#D9D1C2] text-[#8C867A] hover:text-[#2C2C2C]'
                        }`}
                      >
                        {st.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setFetchedBook(null);
                    if (activeTab === 'camera' && selectedCameraId) {
                      startCameraScanner(selectedCameraId);
                    }
                  }}
                  className="px-5 py-2.5 rounded-full border border-[#D9D1C2] bg-[#EAE4D9] text-[#3D3A35] text-xs font-medium hover:bg-[#D9D1C2] transition cursor-pointer"
                >
                  Scan Another
                </button>

                <button
                  id="save-to-shelf-btn"
                  onClick={handleSaveBook}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#5A5A40] hover:bg-[#4A4A34] text-white font-semibold text-xs rounded-full transition shadow-lg shadow-[#5A5A40]/20 cursor-pointer"
                >
                  <BookPlus className="w-4 h-4" />
                  Add to My Bookshelf
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
