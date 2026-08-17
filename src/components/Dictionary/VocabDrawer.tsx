import React, { useState } from 'react';
import { BookX, Trash2, Volume2, Copy, Check, Search, GraduationCap } from 'lucide-react';
import { vocabStorage, VocabWord } from '../../services/vocabStorage';

interface VocabDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  words: VocabWord[];
  onRefresh: () => void;
}

export const VocabDrawer: React.FC<VocabDrawerProps> = ({
  isOpen,
  onClose,
  words,
  onRefresh,
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!isOpen) return null;

  const speak = (word: string) => {
    try {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  const handleCopy = (word: string, translation: string) => {
    try {
      navigator.clipboard.writeText(`${word} → ${translation}`);
      setCopied(word);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const handleDelete = (word: string) => {
    if (confirmDelete === word) {
      vocabStorage.remove(word);
      onRefresh();
      setConfirmDelete(null);
    } else {
      setConfirmDelete(word);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const filtered = words.filter(
    (w) =>
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.translation.includes(search)
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-sm bg-[#F9F7F2] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 text-[#3D3A35] border-l border-[#D9D1C2]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#EAE4D9] bg-[#F5F2ED]">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#5A5A40]" />
            <h3 className="font-serif font-bold text-sm text-[#2C2C2C]">Vocabulary Book</h3>
            <span className="text-[10px] bg-[#EAE4D9] text-[#8C867A] px-2 py-0.5 rounded-full">
              {words.length} words
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9] transition cursor-pointer"
            title="Close"
          >
            <BookX className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        {words.length > 3 && (
          <div className="p-3 border-b border-[#EAE4D9]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C867A]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vocabulary..."
                className="w-full bg-white border border-[#D9D1C2] rounded-full pl-9 pr-4 py-2 text-sm text-[#2C2C2C] placeholder:text-[#A69F92] outline-none focus:border-[#5A5A40]"
              />
            </div>
          </div>
        )}

        {/* Word list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="text-center py-16 px-6 space-y-3 text-[#8C867A]">
              <GraduationCap className="w-12 h-12 mx-auto text-[#D9D1C2]" />
              <p className="text-sm font-medium text-[#2C2C2C]">
                {words.length === 0 ? 'Your vocab book is empty' : 'No matching words'}
              </p>
              <p className="text-xs leading-relaxed max-w-[220px] mx-auto">
                {words.length === 0
                  ? 'Look up a word in the dictionary and tap "Add to Vocabulary" to start building your word list.'
                  : 'Try a different search term.'}
              </p>
            </div>
          )}

          {filtered.map((entry) => (
            <div
              key={entry.word}
              className="px-4 py-3 border-b border-[#EAE4D9] hover:bg-[#EAE4D9]/30 transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-bold text-[#2C2C2C]">
                      {entry.word}
                    </span>
                    {entry.phonetic && (
                      <span className="text-xs text-[#8C867A] font-mono">
                        {entry.phonetic}
                      </span>
                    )}
                    {entry.partOfSpeech && (
                      <span className="text-[10px] font-bold text-white bg-[#5A5A40] px-1.5 py-0.5 rounded-full italic">
                        {entry.partOfSpeech}
                      </span>
                    )}
                    <button
                      onClick={() => speak(entry.word)}
                      className="p-1 rounded-full text-[#A69F92] hover:text-[#5A5A40] transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Pronounce"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-lg font-serif font-bold text-[#5A5A40] mt-0.5">
                    {entry.translation}
                  </p>
                  {entry.sourceBook && (
                    <p className="text-[10px] text-[#A69F92] mt-1 truncate">
                      from: {entry.sourceBook}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleCopy(entry.word, entry.translation)}
                    className="p-1.5 rounded-lg text-[#A69F92] hover:text-[#5A5A40] hover:bg-[#EAE4D9] transition opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Copy"
                  >
                    {copied === entry.word ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(entry.word)}
                    className={`p-1.5 rounded-lg transition opacity-0 group-hover:opacity-100 cursor-pointer ${
                      confirmDelete === entry.word
                        ? 'text-rose-600 bg-rose-50'
                        : 'text-[#A69F92] hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title={confirmDelete === entry.word ? 'Click again to confirm' : 'Remove'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};
