import {
  Sentence as SentenceType,
  LinguisticItem as LinguisticItemType,
} from '@/types/document';
import { LinguisticItem } from './LinguisticItem';

interface SentenceProps {
  sentence: SentenceType;
  paragraphId: number;
  selectedWord: LinguisticItemType | null;
  pendingSaves: Set<string>;
  onWordClick: (item: LinguisticItemType) => void;
}

export function Sentence({
  sentence,
  paragraphId,
  selectedWord,
  pendingSaves,
  onWordClick,
}: SentenceProps) {
  return (
    <span key={sentence.id}>
      {sentence.sentenceItems.map((sentenceItem, index) => {
        const currentItem = sentenceItem.linguisticItem;
        const isCurrentlyEditing = selectedWord === currentItem;

        // Правяраем ці чакае слова захавання
        let isPendingSave = false;
        if (currentItem.type === 1) {
          const wordKey = `${paragraphId}-${sentence.id}-${index}`;
          isPendingSave = pendingSaves.has(wordKey);
        }

        return (
          <span key={`${currentItem.text}-${index}`}>
            <LinguisticItem
              item={currentItem}
              index={index}
              isCurrentlyEditing={isCurrentlyEditing}
              isPendingSave={isPendingSave}
              onWordClick={onWordClick}
            />
            {!currentItem.glueNext && ' '}
          </span>
        );
      })}
    </span>
  );
}
