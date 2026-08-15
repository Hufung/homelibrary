import { HighlightColor, ReaderThemeMode, ReaderSettings } from '../../types';

export interface ColorDef {
  label: string;
  bg: string;
  fillHex: string;
  borderHex: string;
  textClass: string;
  badgeBg: string;
}

export const HighlightingColors: Record<HighlightColor, ColorDef> = {
  yellow: {
    label: 'Warm Amber',
    bg: '#FACC15',
    fillHex: '#FACC15',
    borderHex: '#EAB308',
    textClass: 'text-amber-800 dark:text-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  },
  green: {
    label: 'Sage Green',
    bg: '#86EFAC',
    fillHex: '#86EFAC',
    borderHex: '#4ADE80',
    textClass: 'text-emerald-800 dark:text-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  blue: {
    label: 'Sky Blue',
    bg: '#93C5FD',
    fillHex: '#93C5FD',
    borderHex: '#60A5FA',
    textClass: 'text-blue-800 dark:text-blue-200',
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  },
  pink: {
    label: 'Coral Rose',
    bg: '#FCA5A5',
    fillHex: '#FCA5A5',
    borderHex: '#F87171',
    textClass: 'text-rose-800 dark:text-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
  },
  purple: {
    label: 'Lavender',
    bg: '#D8B4FE',
    fillHex: '#D8B4FE',
    borderHex: '#C084FC',
    textClass: 'text-purple-800 dark:text-purple-200',
    badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
  },
};

export const READER_THEMES: Record<
  ReaderThemeMode,
  {
    name: string;
    bg: string;
    text: string;
    cardBg: string;
    border: string;
    hudBg: string;
    css: {
      background: string;
      color: string;
      '::selection'?: { background: string; color: string };
    };
  }
> = {
  parchment: {
    name: 'Natural Parchment',
    bg: '#F9F7F2',
    text: '#2C2C2C',
    cardBg: '#F5F2ED',
    border: '#D9D1C2',
    hudBg: 'bg-[#F5F2ED]/95',
    css: {
      background: '#F9F7F2 !important',
      color: '#2C2C2C !important',
    },
  },
  sepia: {
    name: 'Warm Sepia',
    bg: '#FBF0D9',
    text: '#4A3525',
    cardBg: '#F3E5C8',
    border: '#E2CEAA',
    hudBg: 'bg-[#F3E5C8]/95',
    css: {
      background: '#FBF0D9 !important',
      color: '#4A3525 !important',
    },
  },
  white: {
    name: 'Clean Light',
    bg: '#FFFFFF',
    text: '#1F2937',
    cardBg: '#F9FAFB',
    border: '#E5E7EB',
    hudBg: 'bg-white/95',
    css: {
      background: '#FFFFFF !important',
      color: '#1F2937 !important',
    },
  },
  dark: {
    name: 'Charcoal Night',
    bg: '#1C1917',
    text: '#E7E5E4',
    cardBg: '#292524',
    border: '#44403C',
    hudBg: 'bg-[#292524]/95',
    css: {
      background: '#1C1917 !important',
      color: '#E7E5E4 !important',
    },
  },
  oled: {
    name: 'Midnight Black',
    bg: '#000000',
    text: '#D4D4D4',
    cardBg: '#121212',
    border: '#262626',
    hudBg: 'bg-[#121212]/95',
    css: {
      background: '#000000 !important',
      color: '#D4D4D4 !important',
    },
  },
};

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 18,
  fontFamily: 'serif',
  lineHeight: 1.65,
  theme: 'parchment',
  spread: 'none', // mobile friendly single page by default
  margin: 16,
};
