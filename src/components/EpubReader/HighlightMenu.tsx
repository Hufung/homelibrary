import React, { useState } from 'react';
import { HighlightColor, EpubHighlight } from '../../types';
import { HighlightingColors } from './readerConstants';
import { MessageSquarePlus, Copy, Trash2, Check, BookOpen } from 'lucide-react';

interface HighlightMenuProps {
  position: { top: number; left: number };
  selectedText: string;
  cfiRange: string;
  existingHighlight?: EpubHighlight;
  onApplyHighlight: (color: HighlightColor, note?: string) => void;
  onRemoveHighlight?: (highlightId: string) => void;
  onClose: () => void;
  onLookup?: (word: string) => void;
}

export const HighlightMenu: React.FC<HighlightMenuProps> = ({
  position,
  selectedText,
  cfiRange,
  existingHighlight,
  onApplyHighlight,
  onRemoveHighlight,
  onClose,
  onLookup,
}) => {
  const [showNoteInput, setShowNoteInput] = useState(Boolean(existingHighlight?.note));
  const [noteText, setNoteText] = useState(existingHighlight?.note || '');
  const [selectedColor, setSelectedColor] = useState<HighlightColor>(existingHighlight?.color || 'yellow');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = (colorToSave: HighlightColor) => {
    onApplyHighlight(colorToSave, noteText.trim() || undefined);
    onClose();
  };

  return (
    <div
      id="epub-highlight-menu"
      className="fixed z-50 transform -translate-x-1/2 animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: Math.max(12, position.top),
        left: Math.min(Math.max(140, position.left), window.innerWidth - 140),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-[#2C2C2C] text-[#F9F7F2] rounded-2xl shadow-2xl border border-stone-700/60 p-2 sm:p-2.5 flex flex-col gap-2 max-w-[340px] sm:max-w-sm backdrop-blur-md">
        {/* Colors Row */}
        <div className="flex items-center gap-1.5 justify-between">
          <div className="flex items-center gap-1.5">
            {(Object.keys(HighlightingColors) as HighlightColor[]).map((colorKey) => {
              const colorDef = HighlightingColors[colorKey];
              const isCurrent = (existingHighlight?.color || selectedColor) === colorKey;
              return (
                <button
                  key={colorKey}
                  onClick={() => {
                    setSelectedColor(colorKey);
                    handleSave(colorKey);
                  }}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center border ${
                    isCurrent ? 'ring-2 ring-white scale-105 border-white' : 'border-black/20'
                  }`}
                  style={{ backgroundColor: colorDef.bg }}
                  title={`Highlight in ${colorDef.label}`}
                >
                  {isCurrent && <Check className="w-3.5 h-3.5 text-stone-900 stroke-[3]" />}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-stone-700 mx-1" />

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className={`p-1.5 rounded-lg transition ${
                showNoteInput ? 'bg-[#5A5A40] text-white' : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
              title="Add Note to Highlight"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>

            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition"
              title="Copy quote"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {onLookup && (
              <button
                onClick={() => {
                  onLookup(selectedText);
                  onClose();
                }}
                className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition"
                title="Look up in dictionary (English → 繁體中文)"
              >
                <BookOpen className="w-4 h-4" />
              </button>
            )}

            {existingHighlight && onRemoveHighlight && (
              <button
                onClick={() => {
                  onRemoveHighlight(existingHighlight.id);
                  onClose();
                }}
                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition"
                title="Remove Highlight"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Note input expander */}
        {showNoteInput && (
          <div className="pt-1.5 border-t border-stone-700/60 flex flex-col gap-1.5">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add your note or reflection..."
              rows={2}
              className="w-full bg-[#1e1e1e] border border-stone-700 rounded-xl p-2 text-xs text-stone-100 placeholder:text-stone-500 outline-none focus:border-[#8C867A] resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-2.5 py-1 rounded-lg text-[11px] text-stone-400 hover:text-stone-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(selectedColor)}
                className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-[#5A5A40] text-white hover:bg-[#4A4A34] transition"
              >
                Save Annotation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
