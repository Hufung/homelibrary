import React from 'react';
import { ReaderSettings, ReaderThemeMode } from '../../types';
import { READER_THEMES } from './readerConstants';
import {
  X,
  Type,
  Sun,
  Moon,
  AlignLeft,
  Columns,
  Minus,
  Plus,
  BookOpen,
} from 'lucide-react';

interface ReaderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
}

export const ReaderSettingsModal: React.FC<ReaderSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const fontFamilies: { id: ReaderSettings['fontFamily']; label: string; preview: string }[] = [
    { id: 'serif', label: 'Georgia Serif', preview: 'Georgia, serif' },
    { id: 'sans', label: 'Modern Sans', preview: 'system-ui, -apple-system, sans-serif' },
    { id: 'merriweather', label: 'Bookman / Classic', preview: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
    { id: 'dyslexic', label: 'Monospace / Clear', preview: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  ];

  return (
    <div
      id="epub-reader-settings-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#F9F7F2] border border-[#D9D1C2] rounded-3xl overflow-hidden shadow-2xl p-5 space-y-5 text-[#3D3A35] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE4D9] pb-3">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-[#5A5A40]" />
            <h3 className="font-serif font-bold text-base text-[#2C2C2C]">Reader Appearance</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme Palette */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#8C867A]">Theme & Lighting</label>
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(READER_THEMES) as ReaderThemeMode[]).map((themeKey) => {
              const th = READER_THEMES[themeKey];
              const isSelected = settings.theme === themeKey;
              return (
                <button
                  key={themeKey}
                  onClick={() => onUpdateSettings({ theme: themeKey })}
                  className={`flex flex-col items-center gap-1 p-2 rounded-2xl border transition cursor-pointer ${
                    isSelected ? 'ring-2 ring-[#5A5A40] border-[#5A5A40] scale-105' : 'border-[#D9D1C2]'
                  }`}
                  style={{ backgroundColor: th.bg }}
                  title={th.name}
                >
                  <span
                    className="text-xs font-bold font-serif"
                    style={{ color: th.text }}
                  >
                    Aa
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Size Stepper */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8C867A] font-semibold">
            <span>Font Size</span>
            <span className="font-mono text-[#5A5A40]">{settings.fontSize}px</span>
          </div>

          <div className="flex items-center gap-2 bg-[#F5F2ED] p-1.5 rounded-2xl border border-[#D9D1C2]">
            <button
              onClick={() => onUpdateSettings({ fontSize: Math.max(13, settings.fontSize - 1) })}
              className="p-2 rounded-xl bg-white border border-[#D9D1C2] hover:bg-[#EAE4D9] transition text-[#3D3A35] flex items-center justify-center flex-1 font-semibold cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5 mr-1" /> A
            </button>

            <span className="px-3 text-sm font-bold font-serif text-[#2C2C2C]">
              {settings.fontSize}
            </span>

            <button
              onClick={() => onUpdateSettings({ fontSize: Math.min(36, settings.fontSize + 1) })}
              className="p-2 rounded-xl bg-white border border-[#D9D1C2] hover:bg-[#EAE4D9] transition text-[#3D3A35] flex items-center justify-center flex-1 font-semibold cursor-pointer"
            >
              A <Plus className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>

        {/* Font Family Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#8C867A]">Typeface</label>
          <div className="grid grid-cols-2 gap-2">
            {fontFamilies.map((font) => (
              <button
                key={font.id}
                onClick={() => onUpdateSettings({ fontFamily: font.id })}
                className={`p-2.5 rounded-xl border text-xs text-left transition cursor-pointer ${
                  settings.fontFamily === font.id
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                    : 'bg-white text-[#3D3A35] border-[#D9D1C2] hover:border-[#8C867A]'
                }`}
                style={{ fontFamily: font.preview }}
              >
                <div className="font-semibold">{font.label}</div>
                <div className="text-[10px] opacity-80">The quick brown fox</div>
              </button>
            ))}
          </div>
        </div>

        {/* Line Height & Page Layout */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#EAE4D9]">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8C867A]">Line Height</label>
            <div className="flex gap-1">
              {[1.4, 1.65, 1.9].map((lh) => (
                <button
                  key={lh}
                  onClick={() => onUpdateSettings({ lineHeight: lh })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition cursor-pointer ${
                    settings.lineHeight === lh
                      ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                      : 'bg-white text-[#3D3A35] border-[#D9D1C2]'
                  }`}
                >
                  {lh}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8C867A]">Page Spread</label>
            <div className="flex gap-1">
              <button
                onClick={() => onUpdateSettings({ spread: 'none' })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  settings.spread === 'none'
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                    : 'bg-white text-[#3D3A35] border-[#D9D1C2]'
                }`}
                title="Single Page (Best for mobile)"
              >
                Single
              </button>
              <button
                onClick={() => onUpdateSettings({ spread: 'auto' })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  settings.spread === 'auto'
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                    : 'bg-white text-[#3D3A35] border-[#D9D1C2]'
                }`}
                title="Two Columns on wide screen"
              >
                Dual
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
