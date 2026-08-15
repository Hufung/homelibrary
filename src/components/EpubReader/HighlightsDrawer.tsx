import React, { useState } from 'react';
import { EpubHighlight, HighlightColor } from '../../types';
import { HighlightingColors } from './readerConstants';
import {
  Highlighter,
  X,
  Search,
  Trash2,
  Edit2,
  Share2,
  Check,
  Bookmark,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

interface HighlightsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  highlights: EpubHighlight[];
  bookTitle: string;
  onJumpToCfi: (cfiRange: string) => void;
  onDeleteHighlight: (id: string) => void;
  onUpdateHighlightNote: (id: string, newNote: string) => void;
}

export const HighlightsDrawer: React.FC<HighlightsDrawerProps> = ({
  isOpen,
  onClose,
  highlights,
  bookTitle,
  onJumpToCfi,
  onDeleteHighlight,
  onUpdateHighlightNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColorFilter, setSelectedColorFilter] = useState<HighlightColor | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [copiedExport, setCopiedExport] = useState(false);

  if (!isOpen) return null;

  const filteredHighlights = highlights
    .filter((hl) => {
      if (selectedColorFilter !== 'all' && hl.color !== selectedColorFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = hl.text.toLowerCase().includes(q);
        const noteMatch = hl.note ? hl.note.toLowerCase().includes(q) : false;
        const chapterMatch = hl.chapterTitle ? hl.chapterTitle.toLowerCase().includes(q) : false;
        return textMatch || noteMatch || chapterMatch;
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Export highlights to markdown
  const handleExportMarkdown = () => {
    let md = `# Highlights & Annotations: ${bookTitle}\n`;
    md += `*Exported from Bibliotheca 3D Reader on ${new Date().toLocaleDateString()}*\n\n`;

    highlights.forEach((hl, idx) => {
      md += `### ${idx + 1}. ${hl.chapterTitle || 'Chapter'}\n`;
      md += `> "${hl.text}"\n\n`;
      if (hl.note) {
        md += `**Note**: ${hl.note}\n\n`;
      }
      md += `*Color: ${hl.color} | Added: ${new Date(hl.createdAt).toLocaleDateString()}*\n\n---\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  return (
    <div
      id="epub-highlights-drawer-overlay"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#F9F7F2] border-l border-[#D9D1C2] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 text-[#3D3A35]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#EAE4D9] bg-[#F5F2ED]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#EAE4D9] border border-[#D9D1C2] flex items-center justify-center text-[#5A5A40]">
              <Highlighter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#2C2C2C]">
                Highlights & Notes ({highlights.length})
              </h3>
              <p className="text-xs text-[#8C867A] truncate max-w-[200px]">{bookTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {highlights.length > 0 && (
              <button
                onClick={handleExportMarkdown}
                className="px-2.5 py-1.5 rounded-full text-xs bg-[#EAE4D9] hover:bg-[#D9D1C2] text-[#3D3A35] transition flex items-center gap-1 font-medium cursor-pointer border border-[#D9D1C2]"
                title="Export highlights to clipboard"
              >
                {copiedExport ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-[#8C867A] hover:text-[#2C2C2C] hover:bg-[#EAE4D9] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 border-b border-[#EAE4D9] bg-[#F5F2ED]/60 space-y-2.5">
          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C867A]" />
            <input
              type="text"
              placeholder="Search quotes, notes or chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#D9D1C2] rounded-full pl-8 pr-3 py-1.5 text-xs text-[#2C2C2C] placeholder:text-[#A69F92] outline-none"
            />
          </div>

          {/* Color filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => setSelectedColorFilter('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer ${
                selectedColorFilter === 'all'
                  ? 'bg-[#5A5A40] text-white'
                  : 'bg-[#EAE4D9] text-[#5A5A40] hover:bg-[#D9D1C2]'
              }`}
            >
              All ({highlights.length})
            </button>
            {(Object.keys(HighlightingColors) as HighlightColor[]).map((cKey) => {
              const count = highlights.filter((h) => h.color === cKey).length;
              if (count === 0 && selectedColorFilter !== cKey) return null;
              const def = HighlightingColors[cKey];
              return (
                <button
                  key={cKey}
                  onClick={() => setSelectedColorFilter(cKey)}
                  className={`px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 font-medium transition cursor-pointer border ${
                    selectedColorFilter === cKey ? 'ring-2 ring-[#5A5A40]' : 'border-black/10'
                  }`}
                  style={{ backgroundColor: def.bg }}
                >
                  <span className="text-stone-900 font-semibold">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Highlights List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredHighlights.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#EAE4D9] text-[#8C867A] flex items-center justify-center mx-auto">
                <Highlighter className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-[#2C2C2C]">No highlights found</p>
              <p className="text-xs text-[#8C867A] max-w-xs mx-auto">
                Select any sentence or paragraph in the EPUB reader to highlight it with vibrant colors and attach your notes.
              </p>
            </div>
          ) : (
            filteredHighlights.map((hl) => {
              const colorDef = HighlightingColors[hl.color] || HighlightingColors.yellow;
              const isEditing = editingId === hl.id;

              return (
                <div
                  key={hl.id}
                  className="bg-[#FFFFFF] rounded-2xl border border-[#D9D1C2] p-3.5 shadow-sm space-y-2.5 transition hover:border-[#8C867A] group relative"
                >
                  {/* Color strip + Chapter header */}
                  <div className="flex items-center justify-between text-[11px] text-[#8C867A]">
                    <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colorDef.bg }}
                      />
                      <span className="font-medium truncate">{hl.chapterTitle || 'Chapter'}</span>
                    </div>
                    <span className="text-[10px] font-mono">
                      {new Date(hl.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Highlighted Quote Text */}
                  <div
                    onClick={() => {
                      onJumpToCfi(hl.cfiRange);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl text-xs font-serif italic text-[#2C2C2C] leading-relaxed cursor-pointer transition hover:opacity-90 border-l-3"
                    style={{
                      backgroundColor: `${colorDef.bg}22`,
                      borderLeftColor: colorDef.bg,
                    }}
                    title="Click to jump to this page in EPUB"
                  >
                    "{hl.text}"
                  </div>

                  {/* Attached Note */}
                  {isEditing ? (
                    <div className="space-y-1.5 pt-1">
                      <textarea
                        value={editNoteText}
                        onChange={(e) => setEditNoteText(e.target.value)}
                        placeholder="Edit your note..."
                        rows={2}
                        className="w-full bg-[#F5F2ED] border border-[#D9D1C2] rounded-xl p-2 text-xs text-[#2C2C2C] outline-none"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 rounded-full text-[11px] text-[#8C867A] hover:text-[#2C2C2C]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            onUpdateHighlightNote(hl.id, editNoteText);
                            setEditingId(null);
                          }}
                          className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#5A5A40] text-white"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : hl.note ? (
                    <div className="flex items-start gap-1.5 p-2 rounded-xl bg-[#F5F2ED] text-xs text-[#5A5A40]">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#5A5A40]" />
                      <p className="flex-1 leading-normal">{hl.note}</p>
                      <button
                        onClick={() => {
                          setEditingId(hl.id);
                          setEditNoteText(hl.note || '');
                        }}
                        className="text-[#8C867A] hover:text-[#2C2C2C] p-1"
                        title="Edit note"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : null}

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#F5F2ED] text-[11px]">
                    <button
                      onClick={() => {
                        onJumpToCfi(hl.cfiRange);
                        onClose();
                      }}
                      className="text-[#5A5A40] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Jump to page
                    </button>

                    <div className="flex items-center gap-1">
                      {!hl.note && !isEditing && (
                        <button
                          onClick={() => {
                            setEditingId(hl.id);
                            setEditNoteText('');
                          }}
                          className="text-[#8C867A] hover:text-[#5A5A40] p-1 rounded transition text-[11px] flex items-center gap-0.5 cursor-pointer"
                          title="Add note"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Add Note</span>
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteHighlight(hl.id)}
                        className="text-[#8C867A] hover:text-rose-600 p-1 rounded transition cursor-pointer"
                        title="Delete highlight"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
