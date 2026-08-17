const VOCAB_KEY = 'bibliotheca_vocab_words';

export interface VocabWord {
  word: string;
  translation: string;
  phonetic?: string;
  partOfSpeech?: string;
  addedAt: string;
  sourceBook?: string;
}

const getAll = (): VocabWord[] => {
  try {
    const stored = localStorage.getItem(VOCAB_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
};

const add = (word: string, translation: string, sourceBook?: string, phonetic?: string, partOfSpeech?: string): VocabWord[] => {
  const words = getAll();
  if (words.some((w) => w.word.toLowerCase() === word.toLowerCase())) return words;
  const entry: VocabWord = {
    word,
    translation,
    phonetic,
    partOfSpeech,
    addedAt: new Date().toISOString(),
    sourceBook,
  };
  const next = [entry, ...words];
  localStorage.setItem(VOCAB_KEY, JSON.stringify(next));
  return next;
};

const remove = (word: string): VocabWord[] => {
  const words = getAll().filter((w) => w.word.toLowerCase() !== word.toLowerCase());
  localStorage.setItem(VOCAB_KEY, JSON.stringify(words));
  return words;
};

const getWords = (): Set<string> => {
  return new Set(getAll().map((w) => w.word.toLowerCase()));
};

export const vocabStorage = { getAll, add, remove, getWords };
