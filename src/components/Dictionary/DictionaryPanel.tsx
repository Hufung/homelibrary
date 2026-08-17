import React, { useState, useEffect, useRef } from 'react';
import {
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
        lookupWord(initialWord).then(({ dict, translation: trans }) => {
          setDictResult(dict);
          setTranslation(trans);
          if (!dict && !trans) {
            setError(`No results found for "${initialWord}". Try another word.`);
          }
          setLoading(false);
        });
        setLoading(true);
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
    <div className="absolute top-0 left-0 right-0 z-[70] border-b border-[#D9D1C2] bg-[#F5F2ED] shadow-md">
      <div className="flex items-center justify-between px-3 md:px-6 py-2 border-b border-[#EAE4D9]">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#5A5A40]" />
          <h3 className="font-serif font-bold text-sm text-[#2C2C2C]">Dictionary</h3>
          {sourceBookTitle && (
            <span className="text-[10px] text-[#A69F92] hidden sm:inline">from: {sourceBookTitle}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9] transition cursor-pointer"
          title="Close dictionary"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-3 md:px-6 py-2.5">
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
              placeholder="Copy a word from the book or type here..."
              className="w-full bg-white border border-[#D9D1C2] rounded-full pl-9 pr-10 py-1.5 text-sm text-[#2C2C2C] placeholder:text-[#A69F92] outline-none focus:border-[#5A5A40]"
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
            className="px-3 py-1.5 rounded-full bg-[#5A5A40] text-white text-sm font-medium hover:bg-[#4A4A35] transition disabled:opacity-40 cursor-pointer"
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
      </form>

      <div className="px-3 md:px-6 pb-3 max-h-[280px] overflow-y-auto space-y-3">
        {query && !loading && !dictResult && !translation && !error && (
          <button
            type="button"
            onClick={() => speak(query)}
            className="flex items-center gap-1.5 text-[10px] text-[#5A5A40] hover:underline cursor-pointer"
          >
            <Volume2 className="w-3 h-3" />
            Pronounce
          </button>
        )}

        {error && (
          <p className="text-sm text-[#8C867A] italic">{error}</p>
        )}

        {loading && (
          <div className="space-y-2 animate-pulse">
            <div className="h-5 bg-[#EAE4D9] rounded w-1/4" />
            <div className="space-y-1.5">
              <div className="h-3 bg-[#EAE4D9] rounded w-full" />
              <div className="h-3 bg-[#EAE4D9] rounded w-4/5" />
            </div>
          </div>
        )}

        {!loading && dictResult && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-lg text-[#2C2C2C]">
                  {dictResult.word}
                </h2>
                {dictResult.phonetic && (
                  <span className="text-xs text-[#8C867A] font-mono">
                    {dictResult.phonetic}
                  </span>
                )}
                <button
                  onClick={() => speak(dictResult.word)}
                  className="p-1 rounded hover:bg-[#EAE4D9] transition cursor-pointer"
                  title="Pronounce"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#5A5A40]" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#D9D1C2] text-[#5A5A40] text-[10px] hover:bg-[#EAE4D9] transition cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={handleAddToVocab}
                  disabled={isSaved || added}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition cursor-pointer ${
                    isSaved || added
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-[#5A5A40] text-white hover:bg-[#4A4A35]'
                  }`}
                >
                  {isSaved ? 'In Vocab' : added ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {isSaved ? 'In Vocab' : added ? 'Added' : 'Vocab'}
                </button>
              </div>
            </div>

            {dictResult.meanings.map((meaning, mi) => (
              <div key={mi} className="border-t border-[#EAE4D9] pt-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-white bg-[#5A5A40] px-2 py-0.5 rounded-full italic">
                    {meaning.partOfSpeech}
                  </span>
                  {meaning.synonyms.length > 0 && (
                    <span className="text-[10px] text-[#8C867A] truncate">
                      synonyms: {meaning.synonyms.slice(0, 3).join(', ')}
                    </span>
                  )}
                </div>
                <ol className="space-y-1.5 list-none">
                  {meaning.definitions.map((def, di) => (
                    <li key={di} className="flex gap-2">
                      <span className="text-[9px] font-bold text-[#5A5A40] bg-[#EAE4D9] rounded-full w-3.5 h-3.5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {di + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed text-[#3D3A35]">
                          {def.definition}
                        </p>
                        {def.example && (
                          <p className="text-[10px] text-[#8C867A] italic mt-0.5 pl-2 border-l-2 border-[#D9D1C2]">
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

        {!loading && translation && (
          <div className="border-t border-[#EAE4D9] pt-2">
            <span className="text-[10px] font-bold text-white bg-[#5A5A40] px-2 py-0.5 rounded-full">
              zh-TW
            </span>
            <p className="text-sm font-serif font-bold text-[#5A5A40] mt-1">
              {translation}
            </p>
          </div>
        )}

        {!loading && !error && !dictResult && !translation && (
          <div className="text-center py-6 text-[#A69F92] space-y-2">
            <BookOpen className="w-6 h-6 mx-auto opacity-30" />
            <p className="text-xs">
              Copy a word from the book and paste here, or type to search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
