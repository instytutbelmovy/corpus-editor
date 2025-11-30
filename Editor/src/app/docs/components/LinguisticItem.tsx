import { LinguisticItem as LinguisticItemType } from '../types';
import { useState } from 'react';

interface LinguisticItemProps {
  item: LinguisticItemType;
  index: number;
  isCurrentlyEditing: boolean;
  isPendingSave: boolean;
  onWordClick: (item: LinguisticItemType) => void;
  isStructureEditingMode: boolean;
}

export function LinguisticItem({
  item,
  index,
  isCurrentlyEditing,
  isPendingSave,
  onWordClick,
  isStructureEditingMode,
}: LinguisticItemProps) {
  const isResolved = item.metadata?.resolvedOn;
  const isWord = item.type === 1;
  const isPunctuation = item.type === 2;
  const isLineBreak = item.type === 4;

  if (isLineBreak) {
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

  const [isDeleteHovered, setIsDeleteHovered] = useState(false);

  if (isStructureEditingMode) {
    return (
      <span className="relative group/item inline-block">
        <span
          key={`${item.text}-${index}`}
          className={`${baseClasses} ${backgroundClasses} ${isPunctuation ? 'bg-transparent' : ''} ${isWord ? 'cursor-text hover:bg-blue-50' : 'cursor-text'} ${editingClasses} ${isDeleteHovered ? '!bg-red-100' : ''} px-[1px]`}
          title={isWord && item.lemma ? item.lemma : undefined}
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            // TODO: Save changes
            console.log('Saved text:', e.currentTarget.textContent);
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
                console.log('Delete item');
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
      className={`${baseClasses} ${backgroundClasses} ${isPunctuation ? 'bg-transparent' : ''} ${isWord ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''} ${editingClasses}`}
      title={isWord && item.lemma ? item.lemma : undefined}
      onClick={isWord ? () => onWordClick(item) : undefined}
    >
      {item.text}
    </span>
  );
}
