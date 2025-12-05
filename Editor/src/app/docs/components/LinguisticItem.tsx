import { LinguisticItem as LinguisticItemType } from '../types';
import { useState, useRef, useEffect } from 'react';
import { useDocumentStore } from '../store';
import { useUIStore } from '../uiStore';

interface LinguisticItemProps {
  item: LinguisticItemType;
  index: number;
  isCurrentlyEditing: boolean;
  isPendingSave: boolean;
  onWordClick: (item: LinguisticItemType) => void;
  isStructureEditingMode: boolean;
  paragraphId?: number;
  sentenceId?: number;
}

export function LinguisticItem({
  item,
  index,
  isCurrentlyEditing,
  isPendingSave,
  onWordClick,
  isStructureEditingMode,
  paragraphId,
  sentenceId,
}: LinguisticItemProps) {
  const { deleteItem, documentData, snapshot, updateDocument } = useDocumentStore();
  const spanRef = useRef<HTMLSpanElement>(null);
  const { selectedWord, clearSelectedWord } = useUIStore();

  // Focus logic
  useEffect(() => {
    if (isStructureEditingMode && isCurrentlyEditing && spanRef.current) {
      spanRef.current.focus();
    }
  }, [isStructureEditingMode, isCurrentlyEditing]);
  const isResolved = item.metadata?.resolvedOn;
  const isWord = item.type === 1;
  const isPunctuation = item.type === 2;
  const isLineBreak = item.type === 4;

  if (isLineBreak) {
    if (isStructureEditingMode) {
      return (
        <>
          <span key={`${item.text}-${index}`} className="relative group/linebreak inline-block">
            <span className="text-gray-400 select-none mx-1 cursor-pointer hover:text-red-500">
              ↵
            </span>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1 pt-2 hidden group-hover/linebreak:flex flex-col z-20">
              <div className="flex flex-col gap-1 bg-white shadow-lg rounded p-1 border border-gray-200 whitespace-nowrap">
                <button
                  className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (paragraphId !== undefined && sentenceId !== undefined) {
                      deleteItem(paragraphId, sentenceId, index);
                    }
                  }}
                >
                  Прыбраць перанос
                </button>
              </div>
            </div>
          </span>
          <br />
        </>
      );
    }
    return <br key={`${item.text}-${Math.random()}`} />;
  }

  const baseClasses = 'inline-block rounded text-sm';

  // Вызначаем класы для фону
  let backgroundClasses = 'bg-transparent';
  if (isWord) {
    if (isStructureEditingMode) {
      // У рэжыме рэдагаваньня структуры не паказваем аранжавы фон
      backgroundClasses = 'bg-transparent';
    } else if (isPendingSave) {
      // Калі слова захоўваецца - сіні фон з анімацыяй
      backgroundClasses = 'animate-pulse bg-blue-200';
    } else if (isResolved) {
      // Калі слова захавана - празрысты фон
      backgroundClasses = 'bg-transparent';
    } else {
      // Калі слова не захавана - аранжавы фон
      backgroundClasses = 'bg-orange-100';
    }
  }

  const editingClasses = isCurrentlyEditing ? 'ring-2 ring-blue-400' : '';

  // Punctuation styling
  let punctuationClasses = isPunctuation ? 'text-amber-700' : '';

  const [isDeleteHovered, setIsDeleteHovered] = useState(false);

  if (isStructureEditingMode) {
    return (
      <span className="relative group/item inline-block">
        <span
          key={`${item.text}-${index}`}
          className={`${baseClasses} ${backgroundClasses} ${isPunctuation ? 'bg-transparent' : ''} ${punctuationClasses} ${isWord ? 'cursor-text hover:bg-blue-50' : 'cursor-text'} ${editingClasses} ${isDeleteHovered ? '!bg-red-100' : ''} px-[1px] min-w-[1px] min-h-[1.5em] align-middle`}
          title={isWord && item.lemma ? item.lemma : undefined}
          ref={spanRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            const newText = e.currentTarget.textContent || '';
            if (newText !== item.text) {
              updateDocument(prev => {
                if (!prev) return prev;
                const newData = { ...prev };
                // Find and update item
                for (const p of newData.paragraphs) {
                  if (p.id === paragraphId) {
                    for (const s of p.sentences) {
                      if (s.id === sentenceId) {
                        const i = s.sentenceItems[index];
                        if (i) {
                          i.linguisticItem.text = newText;
                        }
                      }
                    }
                  }
                }
                return newData;
              });

              // Snapshot after saving to capture the new state for Redo
              // Snapshot after saving to capture the new state for Redo
              // If the word was empty (newly added), we replace the "Add Word" history entry
              // with this "Add Word + Text" entry, so Undo removes the word entirely.
              snapshot(item.text === '');
            }
            // Clear selection on blur
            clearSelectedWord();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {item.text}
        </span>

        {/* Delete button */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1 pt-2 hidden group-hover/item:block z-20">
          <div className="flex flex-col gap-1 bg-white shadow-lg rounded p-1 border border-gray-200 whitespace-nowrap">
            <button
              className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                if (paragraphId !== undefined && sentenceId !== undefined) {
                  deleteItem(paragraphId, sentenceId, index);
                }
              }}
              onMouseEnter={() => setIsDeleteHovered(true)}
              onMouseLeave={() => setIsDeleteHovered(false)}
            >
              Выдаліць
            </button>
          </div>
        </div>
      </span>
    );
  }

  return (
    <span
      key={`${item.text}-${index}`}
      className={`${baseClasses} ${backgroundClasses} ${isPunctuation ? 'bg-transparent' : ''} ${punctuationClasses} ${isWord ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''} ${editingClasses}`}
      title={isWord && item.lemma ? item.lemma : undefined}
      onClick={isWord ? () => onWordClick(item) : undefined}
    >
      {item.text}
    </span>
  );
}
