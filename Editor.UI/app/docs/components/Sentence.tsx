import {
  Sentence as SentenceType,
  SelectedWord,
  SentenceItemType,
} from '../types';
import { LinguisticItem } from './LinguisticItem';
import { InteractiveSpace } from './InteractiveSpace';
import { HoverMenu } from './HoverMenu';
import { useDocumentStore } from '../store';
import { useAddItem } from '../hooks/useAddItem';
import { wordKey } from '../wordEditing';
import { WordClickHandler } from './DocumentContent';

interface SentenceProps {
  sentence: SentenceType;
  paragraphId: number;
  selectedWord: SelectedWord | null;
  pendingSaves: Set<string>;
  onWordClick: WordClickHandler;
  isStructureEditingMode: boolean;
  index: number;
  isLastSentence: boolean;
  nextSentenceId?: number;
}

export function Sentence({
  sentence,
  paragraphId,
  selectedWord,
  pendingSaves,
  onWordClick,
  isStructureEditingMode,
  index,
  isLastSentence,
  nextSentenceId,
}: SentenceProps) {
  const { splitParagraph, joinSentence, setGlue } = useDocumentStore();
  const { handleAddWord, handleAddPunctuation } = useAddItem();

  // У рэжыме структуры чаргуем фон сказаў
  const bgClass =
    isStructureEditingMode && index % 2 !== 0 ? 'bg-yellow-50' : '';

  return (
    <span className={bgClass}>
      {/* Дадаць слова ў пачатак сказа */}
      {isStructureEditingMode && (
        <HoverMenu
          group="start"
          marker="&nbsp;"
          markerClassName="inline-block w-1 text-center cursor-pointer hover:bg-blue-200 rounded"
          above={[
            {
              label: 'Дадаць слова',
              onClick: () => handleAddWord(paragraphId, sentence.id, -1),
            },
          ]}
        />
      )}

      {sentence.sentenceItems.map((sentenceItem, itemIndex) => {
        const currentItem = sentenceItem.linguisticItem;
        const nextItem = sentence.sentenceItems[itemIndex + 1]?.linguisticItem;
        const isCurrentlyEditing = Boolean(
          selectedWord &&
            selectedWord.paragraphId === paragraphId &&
            selectedWord.sentenceId === sentence.id &&
            selectedWord.wordIndex === itemIndex
        );
        const isPendingSave =
          currentItem.type === SentenceItemType.Word &&
          pendingSaves.has(
            wordKey({
              paragraphId,
              sentenceId: sentence.id,
              wordIndex: itemIndex,
            })
          );

        // Зьляпленьне мае сэнс толькі побач з пунктуацыяй
        const canGlue = Boolean(
          nextItem &&
            (currentItem.type === SentenceItemType.Punctuation ||
              nextItem.type === SentenceItemType.Punctuation)
        );

        return (
          <span key={`${currentItem.text}-${itemIndex}`}>
            <LinguisticItem
              item={currentItem}
              index={itemIndex}
              isCurrentlyEditing={isCurrentlyEditing}
              isPendingSave={isPendingSave}
              onWordClick={onWordClick}
              isStructureEditingMode={isStructureEditingMode}
              paragraphId={paragraphId}
              sentenceId={sentence.id}
            />

            {/* Зьлепленыя элемэнты: прабелу няма, але дзеяньні патрэбныя */}
            {currentItem.glueNext && isStructureEditingMode && (
              <HoverMenu
                group="glued"
                marker=""
                markerClassName="inline-block w-0.5 text-center cursor-pointer hover:bg-blue-200 rounded align-middle h-4"
                above={[
                  {
                    label: 'Дадаць слова',
                    onClick: () =>
                      handleAddWord(paragraphId, sentence.id, itemIndex),
                  },
                  {
                    label: 'Дадаць пунктуацыю',
                    onClick: () =>
                      handleAddPunctuation(paragraphId, sentence.id, itemIndex),
                  },
                  {
                    label: 'Дадаць прабел',
                    onClick: () =>
                      setGlue(paragraphId, sentence.id, itemIndex, false),
                  },
                ]}
              />
            )}

            {!currentItem.glueNext &&
              (isStructureEditingMode ? (
                <InteractiveSpace
                  canGlue={canGlue}
                  isLastItem={itemIndex === sentence.sentenceItems.length - 1}
                  paragraphId={paragraphId}
                  sentenceId={sentence.id}
                  itemIndex={itemIndex}
                />
              ) : (
                ' '
              ))}
          </span>
        );
      })}

      {/* Мяжа паміж сказамі */}
      {isStructureEditingMode && !isLastSentence && (
        <HoverMenu
          group="boundary"
          marker="|"
          markerClassName="text-gray-400 select-none mx-1 cursor-pointer hover:text-blue-500"
          above={[
            {
              label: 'Разьбіць на абзацы',
              onClick: () =>
                nextSentenceId && splitParagraph(paragraphId, nextSentenceId),
            },
          ]}
          below={[
            {
              label: "Аб'яднаць сказы",
              danger: true,
              onClick: () => joinSentence(paragraphId, sentence.id),
            },
          ]}
        />
      )}
    </span>
  );
}
