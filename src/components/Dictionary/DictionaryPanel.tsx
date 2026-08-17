import React, { useState, useEffect, useRef } from 'react';
import {
  BookX,
  Volume2,
  Copy,
  Check,
  Search,
  Plus,
  X,
  BookOpen,
} from 'lucide-react';

interface DictionaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialWord?: string;
  sourceBookTitle?: string;
  onAddToVocab: (word: string, translation: string, phonetic?: string, partOfSpeech?: string) => void;
  vocabWords: Set<string>;
  onSelectWord?: (word: string) => void;
}

interface DictMeaning {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
  synonyms: string[];
}

interface DictResult {
  word: string;
  phonetic: string;
  audio: string;
  meanings: DictMeaning[];
}

const isEnglish = (text: string) => /^[a-zA-Z\s'-]+$/.test(text.trim());

const lookupWord = async (
  word: string
): Promise<{ dict: DictResult | null; translation: string }> => {
  let dict: DictResult | null = null;
  let translation = '';

  if (isEnglish(word)) {
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      );
      if (res.ok) {
        const data = await res.json();
        const entry = data[0];
        const phonetic =
          entry.phonetic ||
          entry.phonetics?.find((p: any) => p.text)?.text ||
          '';
        const audio =
          entry.phonetics?.find((p: any) => p.audio)?.audio || '';
        const meanings: DictMeaning[] = (entry.meanings || []).map((m: any) => ({
          partOfSpeech: m.partOfSpeech,
          definitions: (m.definitions || []).slice(0, 3).map((d: any) => ({
            definition: d.definition,
            example: d.example,
          })),
          synonyms: (m.synonyms || []).slice(0, 5),
        }));
        dict = { word: entry.word, phonetic, audio, meanings };
      }
    } catch {}
  }

  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        word
      )}&langpair=en|zh-TW`
    );
    const data = await res.json();
    const t = data?.responseData?.translatedText;
    if (t && t.toLowerCase() !== word.toLowerCase()) {
      translation = t;
    }
  } catch {}

  return { dict, translation };
};

export const DictionaryPanel: React.FC<DictionaryPanelProps> = ({
  isOpen,
  onClose,
  initialWord,
  sourceBookTitle,
  onAddToVocab,
  vocabWords,
  onSelectWord,
}) => {
  const [query, setQuery] = useState('');
  const [translation, setTranslation] = useState('');
  const [dictResult, setDictResult] = useState<DictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialWord) {
        setQuery(initialWord);
        performLookup(initialWord);
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialWord]);

  const performLookup = async (word: string) => {
    if (!word.trim()) return;
    setLoading(true);
    setError('');
    setTranslation('');
    setDictResult(null);
    setCopied(false);
    setAdded(false);

    const { dict, translation: trans } = await lookupWord(word.trim());

    setDictResult(dict);
    setTranslation(trans);

    if (!dict && !trans) {
      setError(`No results found for "${word}". Try another word.`);
    }
    setLoading(false);
  };

  const speak = (text: string) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  const handleCopy = () => {
    if (!query) return;
    const parts = [query];
    if (dictResult?.phonetic) parts.push(dictResult.phonetic);
    dictResult?.meanings.forEach((m) => {
      m.definitions.forEach((d) => parts.push(`(${m.partOfSpeech}) ${d.definition}`));
    });
    if (translation) parts.push(`→ ${translation}`);
    navigator.clipboard.writeText(parts.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAddToVocab = () => {
    if (!query || added) return;
    const firstPos = dictResult?.meanings?.[0]?.partOfSpeech;
    onAddToVocab(query.trim(), translation, dictResult?.phonetic, firstPos);
    setAdded(true);
  };

  const isSaved = vocabWords.has(query.toLowerCase());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) performLookup(query.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full z-[60] pointer-events-none">
      <aside
        className="absolute top-0 right-0 w-full max-w-sm h-full flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 flex flex-col bg-[#F9F7F2] border-l border-[#D9D1C2] shadow-[-4px_0_24px_rgba(0,0,0,0.08)] h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAE4D9] bg-[#F5F2ED]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#5A5A40]" />
              <h3 className="font-serif font-bold text-sm text-[#2C2C2C]">Dictionary</h3>
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
          <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-[#EAE4D9] bg-white/50">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C867A]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setAdded(false);
                  }}
                  placeholder="Type a word..."
                  className="w-full bg-white border border-[#D9D1C2] rounded-full pl-9 pr-10 py-2 text-sm text-[#2C2C2C] placeholder:text-[#A69F92] outline-none focus:border-[#5A5A40]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setDictResult(null);
                      setTranslation('');
                      setError('');
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A69F92] hover:text-[#5A5A40] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-3 py-2 rounded-full bg-[#5A5A40] text-white text-sm font-medium hover:bg-[#4A4A35] transition disabled:opacity-40 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  </span>
                ) : (
                  'Look up'
                )}
              </button>
            </div>
            {query && (
              <button
                type="button"
                onClick={() => speak(query)}
                className="mt-2 flex items-center gap-1.5 text-[10px] text-[#5A5A40] hover:underline cursor-pointer"
              >
                <Volume2 className="w-3 h-3" />
                Pronounce
              </button>
            )}
          </form>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {error && (
              <p className="text-sm text-[#8C867A] italic">{error}</p>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-[#EAE4D9] rounded w-1/3" />
                <div className="space-y-2">
                  <div className="h-4 bg-[#EAE4D9] rounded w-full" />
                  <div className="h-4 bg-[#EAE4D9] rounded w-5/6" />
                </div>
                <div className="h-px bg-[#EAE4D9]" />
                <div className="space-y-2">
                  <div className="h-4 bg-[#EAE4D9] rounded w-full" />
                  <div className="h-4 bg-[#EAE4D9] rounded w-3/4" />
                </div>
              </div>
            )}

            {/* Dictionary result */}
            {!loading && dictResult && (
              <>
                {/* Word header */}
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-serif font-bold text-2xl text-[#2C2C2C]">
                      {dictResult.word}
                    </h2>
                    {dictResult.phonetic && (
                      <span className="text-sm text-[#8C867A] font-mono">
                        {dictResult.phonetic}
                      </span>
                    )}
                  </div>
                  {sourceBookTitle && (
                    <p className="text-[10px] text-[#A69F92] mt-1">
                      from: {sourceBookTitle}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D9D1C2] text-[#5A5A40] text-xs hover:bg-[#EAE4D9] transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleAddToVocab}
                    disabled={isSaved || added}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                      isSaved || added
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-[#5A5A40] text-white hover:bg-[#4A4A35]'
                    }`}
                  >
                    {isSaved ? (
                      'In Vocab'
                    ) : added ? (
                      <>
                        <Check className="w-3 h-3" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        Add to Vocab
                      </>
                    )}
                  </button>
                </div>

                {/* Meanings grouped by part of speech */}
                {dictResult.meanings.map((meaning, mi) => (
                  <div key={mi} className="border-t border-[#EAE4D9] pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-white bg-[#5A5A40] px-2 py-0.5 rounded-full italic">
                        {meaning.partOfSpeech}
                      </span>
                      {meaning.synonyms.length > 0 && (
                        <span className="text-[10px] text-[#8C867A]">
                          synonyms: {meaning.synonyms.join(', ')}
                        </span>
                      )}
                    </div>
                    <ol className="space-y-2.5 list-none">
                      {meaning.definitions.map((def, di) => (
                        <li key={di} className="flex gap-2">
                          <span className="text-[10px] font-bold text-[#5A5A40] bg-[#EAE4D9] rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {di + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-[13px] leading-relaxed text-[#3D3A35]">
                              {def.definition}
                            </p>
                            {def.example && (
                              <p className="text-xs text-[#8C867A] italic mt-1 pl-2 border-l-2 border-[#D9D1C2]">
                                "{def.example}"
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </>
            )}

            {/* Translation (Chinese) */}
            {!loading && translation && (
              <div className="border-t border-[#EAE4D9] pt-3">
                <span className="text-[10px] font-bold text-white bg-[#5A5A40] px-2 py-0.5 rounded-full">
                  zh-TW
                </span>
                <p className="text-lg font-serif font-bold text-[#5A5A40] mt-2">
                  {translation}
                </p>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && !dictResult && !translation && (
              <div className="text-center py-12 text-[#A69F92] space-y-3">
                <BookOpen className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm">
                  Type a word to look up its meaning, part of speech, and
                  examples.
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
