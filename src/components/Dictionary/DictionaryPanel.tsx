import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, X, Search, Loader2, Volume2, Copy, Check, History, BookPlus } from 'lucide-react';

interface DictionaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialWord?: string;
  onLookupRequest?: (word: string) => void;
  onAddToVocab?: (word: string, translation: string) => void;
  vocabWords?: Set<string>;
}

interface DictionaryResult {
  word: string;
  translation: string;
  source: string;
}

const HISTORY_KEY = 'bibliotheca_dictionary_history';

const getHistory = (): string[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
};

export const DictionaryPanel: React.FC<DictionaryPanelProps> = ({
  isOpen,
  onClose,
  initialWord,
  onLookupRequest,
  onAddToVocab,
  vocabWords,
}) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(getHistory());
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);

  const lookup = async (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setLoading(true);
    setError(null);
    setResult(null);
    setAdded(false);
    try {
      const resp = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|zh-TW`
      );
      const data = await resp.json();
      const responseData = data?.responseData;
      const translated = responseData?.translatedText;
      if (!translated || data?.responseStatus !== 200) {
        throw new Error('No translation available');
      }
      const clean = translated.replace(/^[^A-Za-z\u4e00-\u9fff]+/, '').trim();
      if (!clean) throw new Error('No translation available');
      setResult({
        word: trimmed,
        translation: clean,
        source: data?.responseDetails || 'MyMemory',
      });
      const next = [trimmed, ...history.filter((h) => h.toLowerCase() !== trimmed.toLowerCase())].slice(0, 12);
      setHistory(next);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {}
      onLookupRequest?.(trimmed);
    } catch {
      setError('Could not look up this word. Please check your spelling and try again.');
    } finally {
      setLoading(false);
    }
  };

  const autoRanRef = useRef(false);
  useEffect(() => {
    if (isOpen && initialWord && !autoRanRef.current) {
      autoRanRef.current = true;
      lookup(initialWord);
    }
    if (!isOpen) autoRanRef.current = false;
  }, [isOpen, initialWord]);

  if (!isOpen) return null;

  const speak = (word: string) => {
    try {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  const handleCopy = () => {
    if (!result) return;
    try {
      navigator.clipboard.writeText(`${result.word} → ${result.translation}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleAddToVocab = () => {
    if (!result || !onAddToVocab) return;
    onAddToVocab(result.word, result.translation);
    setAdded(true);
  };

  const inVocab = result ? vocabWords?.has(result.word.toLowerCase()) : false;

  return (
    <aside
      className="fixed top-0 right-0 z-[60] w-full max-w-sm bg-[#F9F7F2] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 text-[#3D3A35] border-l border-[#D9D1C2]"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#EAE4D9] bg-[#F5F2ED]">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#5A5A40]" />
          <h3 className="font-serif font-bold text-sm text-[#2C2C2C]">Dictionary</h3>
          <span className="text-[10px] bg-[#EAE4D9] text-[#8C867A] px-2 py-0.5 rounded-full">
            EN → 繁體中文
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9] transition cursor-pointer"
          title="Close dictionary"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-[#EAE4D9] bg-[#F5F2ED]/60">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(query);
          }}
          className="relative"
        >
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C867A]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter an English word..."
            className="w-full bg-[#FFFFFF] border border-[#D9D1C2] rounded-full pl-9 pr-16 py-2 text-sm text-[#2C2C2C] placeholder:text-[#A69F92] outline-none focus:border-[#5A5A40]"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-[#5A5A40] text-white text-xs font-semibold disabled:opacity-40 hover:bg-[#4a4a33] transition cursor-pointer"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Look up'}
          </button>
        </form>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#5A5A40]">
            <Loader2 className="w-7 h-7 animate-spin" />
            <p className="text-xs font-medium">Looking up...</p>
          </div>
        )}

        {!loading && !error && !result && history.length === 0 && (
          <div className="text-center py-10 px-4 space-y-2 text-[#8C867A]">
            <Search className="w-9 h-9 mx-auto text-[#D9D1C2]" />
            <p className="text-sm font-medium text-[#2C2C2C]">Look up any word</p>
            <p className="text-xs leading-relaxed">
              Type an English word above or select text in the book to translate it into
              traditional Chinese.
            </p>
          </div>
        )}

        {result && (
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9D1C2] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#EAE4D9] flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-serif font-bold text-[#2C2C2C]">
                    {result.word}
                  </span>
                  <button
                    onClick={() => speak(result.word)}
                    className="p-1.5 rounded-full text-[#8C867A] hover:text-[#2C2C2C] hover-bg-[#EAE4D9] transition cursor-pointer"
                    title="Pronounce"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-[#A69F92] uppercase tracking-wide mt-0.5">
                  English
                </p>
              </div>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-[#8C867A] hover:text-[#2C2C2C] hover-bg-[#EAE4D9] transition cursor-pointer"
                title="Copy"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="px-4 py-4">
              <p className="text-2xl font-serif font-bold text-[#5A5A40] leading-snug">
                {result.translation}
              </p>
              <p className="text-[11px] text-[#8C867A] mt-2">
                Traditional Chinese definition
              </p>
            </div>

            {/* Add to Vocab button */}
            {onAddToVocab && (
              <div className="px-4 pb-4">
                <button
                  onClick={handleAddToVocab}
                  disabled={inVocab || added}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-default bg-[#F5F2ED] border-[#D9D1C2] text-[#5A5A40] hover:bg-[#EAE4D9]"
                >
                  {inVocab || added ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      Saved to Vocab
                    </>
                  ) : (
                    <>
                      <BookPlus className="w-4 h-4" />
                      Add to Vocabulary
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8C867A] mb-2">
              <History className="w-3 h-3" />
              Recent lookups
            </div>
            <div className="flex flex-wrap gap-1.5">
              {history.map((word) => (
                <button
                  key={word}
                  onClick={() => lookup(word)}
                  className="px-2.5 py-1 rounded-full bg-[#EAE4D9] hover:bg-[#D9D1C2] text-[11px] font-medium text-[#5A5A40] transition cursor-pointer"
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
