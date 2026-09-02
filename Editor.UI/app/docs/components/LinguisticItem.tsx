import { useRef, useEffect } from 'react';
import {
  LinguisticItem as LinguisticItemType,
  SentenceItemType,
} from '../types';
import { useDocumentStore } from '../store';
import { useUIStore } from '../uiStore';
import { HoverMenu } from './HoverMenu';
import { WordClickHandler } from './DocumentContent';

interface LinguisticItemProps {
  item: LinguisticItemType;
  index: number;
  isCurrentlyEditing: boolean;
  isPendingSave: boolean;
  onWordClick: WordClickHandler;
  isStructureEditingMode: boolean;
  paragraphId: number;
  sentenceId: number;
}

// Знак націску, які ставіцца клавішай «+»
const STRESS_MARK = '́';

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
  const { deleteItem, updateItemText } = useDocumentStore();
  const { clearSelectedWord } = useUIStore();
  const spanRef = useRef<HTMLSpanElement>(null);

  const isWord = item.type === SentenceItemType.Word;
  const isPunctuation = item.type === SentenceItemType.Punctuation;
  const isLineBreak = item.type === SentenceItemType.LineBreak;

  // Пасьля дадаваньня слова курсор ставім у яго
  useEffect(() => {
    if (isStructureEditingMode && isCurrentlyEditing && spanRef.current) {
      spanRef.current.focus();
    }
  }, [isStructureEditingMode, isCurrentlyEditing]);

  const handleDelete = () => deleteItem(paragraphId, sentenceId, index);

  if (isLineBreak) {
    if (!isStructureEditingMode) {
      return <br />;
    }
    return (
      <>
        <HoverMenu
          group="linebreak"
          marker={
            <span className="text-gray-400 select-none mx-1 cursor-pointer hover:text-red-500">
              ↵
            </span>
          }
          markerClassName="inline-block"
          below={[
            {
              label: 'Прыбраць перанос',
              danger: true,
              onClick: handleDelete,
            },
          ]}
        />
        <br />
      </>
    );
  }

  // Аранжавы фон — слова яшчэ не разьмечана, сіні з пульсацыяй — захоўваецца.
  // У рэжыме структуры разьметка не паказваецца.
  let backgroundClasses = 'bg-transparent';
  if (isWord && !isStructureEditingMode) {
    if (isPendingSave) {
      backgroundClasses = 'animate-pulse bg-blue-200';
    } else if (!item.metadata?.resolvedOn) {
      backgroundClasses = 'bg-orange-100';
    }
  }

  const commonClasses = [
    'inline-block rounded text-sm',
    isPunctuation ? 'bg-transparent text-amber-700' : backgroundClasses,
    isCurrentlyEditing ? 'ring-2 ring-blue-400' : '',
  ].join(' ');

  const title = isWord && item.lemma ? item.lemma : undefined;

  if (!isStructureEditingMode) {
    return (
      <span
        className={`${commonClasses} ${
          isWord ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''
        }`}
        title={title}
        onClick={
          isWord ? () => onWordClick(paragraphId, sentenceId, index) : undefined
        }
      >
        {item.text}
      </span>
    );
  }

  return (
    <HoverMenu
      group="item"
      markerClassName="inline-block"
      zIndex={20}
      marker={
        <span
          className={`${commonClasses} ${
            isWord ? 'cursor-text hover:bg-blue-50' : 'cursor-text'
          } px-[1px] min-w-[1px] min-h-[1.5em] align-middle`}
          title={title}
          ref={spanRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={event => {
            const newText = event.currentTarget.textContent || '';
            if (newText !== item.text) {
              // Для толькі што дададзенага (пустога) слова замяняем запіс гісторыі,
              // каб undo выдаліла слова цалкам, а не толькі яго тэкст
              updateItemText(
                paragraphId,
                sentenceId,
                index,
                newText,
                item.text === ''
              );
            }
            clearSelectedWord();
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === '+' && isWord) {
              event.preventDefault();
              insertStressMark();
            }
          }}
          onClick={event => event.stopPropagation()}
        >
          {item.text}
        </span>
      }
      below={[
        {
          label: 'Выдаліць',
          danger: true,
          highlightMarkerOnHover: true,
          onClick: handleDelete,
        },
      ]}
    />
  );
}

function insertStressMark() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const textNode = document.createTextNode(STRESS_MARK);
  range.deleteContents();
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);
}
