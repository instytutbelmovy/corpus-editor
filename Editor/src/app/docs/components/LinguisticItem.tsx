import { LinguisticItem as LinguisticItemType } from '../types';
import { useState, useRef, useEffect } from 'react';
import { useDocumentStore } from '../store';
import { useUIStore } from '../uiStore';
import { DeleteMenu } from './DeleteMenu';

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
  const { deleteItem } = useDocumentStore();
  const spanRef = useRef<HTMLSpanElement>(null);
  const { clearSelectedWord } = useUIStore();
  const [isDeleteHovered, setIsDeleteHovered] = useState(false);

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
            <DeleteMenu
              groupHoverClass="group-hover/linebreak:flex"
              label="Прыбраць перанос"
              onDelete={() => {
                if (paragraphId !== undefined && sentenceId !== undefined) {
                  deleteItem(paragraphId, sentenceId, index);
                }
              }}
            />
          </span>
          <br />
        </>
      );
    }
    return <br key={`${item.text}-${index}`} />;
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
  const punctuationClasses = isPunctuation ? 'text-amber-700' : '';


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
              if (paragraphId !== undefined && sentenceId !== undefined) {
                // If the word was empty (newly added), we replace the "Add Word" history entry
                // with this "Add Word + Text" entry, so Undo removes the word entirely.
                const replaceHistory = item.text === '';
                useDocumentStore.getState().updateItemText(paragraphId, sentenceId, index, newText, replaceHistory);
              }
            }
            // Clear selection on blur
            clearSelectedWord();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === '+' && isWord) {
              e.preventDefault();
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const textNode = document.createTextNode('\u0301');
                range.deleteContents();
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {item.text}
        </span>

        {/* Delete button */}
        <DeleteMenu
          groupHoverClass="group-hover/item:flex"
          label="Выдаліць"
          onDelete={() => {
            if (paragraphId !== undefined && sentenceId !== undefined) {
              deleteItem(paragraphId, sentenceId, index);
            }
          }}
          onMouseEnter={() => setIsDeleteHovered(true)}
          onMouseLeave={() => setIsDeleteHovered(false)}
        />
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
