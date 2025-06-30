import { LinguisticItem as LinguisticItemType } from '@/types/document';

interface LinguisticItemProps {
  item: LinguisticItemType;
  index: number;
  isCurrentlyEditing: boolean;
  isPendingSave: boolean;
  onWordClick: (item: LinguisticItemType) => void;
}

export function LinguisticItem({
  item,
  index,
  isCurrentlyEditing,
  isPendingSave,
  onWordClick,
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
    if (isPendingSave) {
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
