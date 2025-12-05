import {
  Sentence as SentenceType,
  LinguisticItem as LinguisticItemType,
  SelectedWord,
} from '../types';
import { LinguisticItem } from './LinguisticItem';
import { InteractiveSpace } from './InteractiveSpace';
import { useDocumentStore } from '../store';
import { useWordSelection } from '../hooks/useWordSelection';
import { useUIStore } from '../uiStore';

interface SentenceProps {
  sentence: SentenceType;
  paragraphId: number;
  selectedWord: SelectedWord | null;
  pendingSaves: Set<string>;
  onWordClick: (item: LinguisticItemType) => void;
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
  const bgClass = isStructureEditingMode && index % 2 !== 0 ? 'bg-yellow-50' : '';
  const { addWord, addPunctuation, splitParagraph, joinSentence, setGlue } = useDocumentStore();
  const { selectWord } = useWordSelection();
  const { setIsEditingText } = useUIStore();

  return (
    <span key={sentence.id} className={bgClass}>
      {/* Start of sentence action */}
      {isStructureEditingMode && (
        <span className="relative group/start inline-block w-1 text-center cursor-pointer hover:bg-blue-200 rounded">
          &nbsp;
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 translate-y-1 pb-2 hidden group-hover/start:flex flex-col z-10 min-w-[150px]">
            <div className="flex flex-col gap-1 bg-white shadow-lg rounded p-1 border border-gray-200 whitespace-nowrap">
              <button
                className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left"
                onClick={() => {
                  addWord(paragraphId, sentence.id, -1);
                  const { documentData } = useDocumentStore.getState();
                  if (documentData) {
                    const paragraph = documentData.paragraphs.find(p => p.id === paragraphId);
                    const currentSentence = paragraph?.sentences.find(s => s.id === sentence.id);
                    const newItem = currentSentence?.sentenceItems[0]?.linguisticItem;
                    if (newItem) {
                      selectWord(newItem, paragraphId, sentence.id, 0);
                      setIsEditingText(true);
                    }
                  }
                }}
              >
                Дадаць слова
              </button>
            </div>
          </div>
        </span>
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

        if (isCurrentlyEditing) {
          console.log('[Sentence] isCurrentlyEditing TRUE for:', paragraphId, sentence.id, itemIndex);
        } else if (selectedWord && selectedWord.paragraphId === paragraphId && selectedWord.sentenceId === sentence.id && selectedWord.wordIndex === itemIndex) {
          console.log('[Sentence] isCurrentlyEditing FALSE but IDs match? This should not happen.', isCurrentlyEditing);
        }

        // Правяраем ці чакае слова захаваньня
        let isPendingSave = false;
        if (currentItem.type === 1) {
          const wordKey = `${paragraphId}-${sentence.id}-${itemIndex}`;
          isPendingSave = pendingSaves.has(wordKey);
        }

        const isWord = currentItem.type === 1;
        const isPunctuation = currentItem.type === 2;
        const isNextPunctuation = nextItem?.type === 2;
        const canGlue = (isPunctuation || isNextPunctuation) && nextItem;

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

            {/* Glued punctuation handling */}
            {currentItem.glueNext && isStructureEditingMode && (
              <span className="relative group/glued inline-block w-0.5 text-center cursor-pointer hover:bg-blue-200 rounded align-middle h-4">
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 translate-y-1 pb-2 hidden group-hover/glued:flex flex-col z-10 min-w-[150px]">
                  <div className="flex flex-col gap-1 bg-white shadow-lg rounded p-1 border border-gray-200 whitespace-nowrap">
                    <button
                      className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left"
                      onClick={() => {
                        addWord(paragraphId, sentence.id, itemIndex);
                        const { documentData } = useDocumentStore.getState();
                        if (documentData) {
                          const paragraph = documentData.paragraphs.find(p => p.id === paragraphId);
                          const currentSentence = paragraph?.sentences.find(s => s.id === sentence.id);
                          const newItem = currentSentence?.sentenceItems[itemIndex + 1]?.linguisticItem;
                          if (newItem) {
                            selectWord(newItem, paragraphId, sentence.id, itemIndex + 1);
                            setIsEditingText(true);
                          }
                        }
                      }}
                    >
                      Дадаць слова
                    </button>
                    <button
                      className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left"
                      onClick={() => {
                        addPunctuation(paragraphId, sentence.id, itemIndex);
                        const { documentData } = useDocumentStore.getState();
                        if (documentData) {
                          const paragraph = documentData.paragraphs.find(p => p.id === paragraphId);
                          const currentSentence = paragraph?.sentences.find(s => s.id === sentence.id);
                          const newItem = currentSentence?.sentenceItems[itemIndex + 1]?.linguisticItem;
                          if (newItem) {
                            selectWord(newItem, paragraphId, sentence.id, itemIndex + 1);
                            setIsEditingText(true);
                          }
                        }
                      }}
                    >
                      Дадаць пунктуацыю
                    </button>
                    <button
                      className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left"
                      onClick={() => setGlue(paragraphId, sentence.id, itemIndex, false)}
                    >
                      Дадаць прабел
                    </button>
                  </div>
                </div>
              </span>
            )}

            {!currentItem.glueNext && (
              isStructureEditingMode ? (
                <InteractiveSpace
                  canGlue={Boolean(canGlue)}
                  isLastItem={itemIndex === sentence.sentenceItems.length - 1}
                  paragraphId={paragraphId}
                  sentenceId={sentence.id}
                  itemIndex={itemIndex}
                />
              ) : ' '
            )}
          </span>
        );
      })}
      {isStructureEditingMode && !isLastSentence && (
        <span className="text-gray-400 select-none mx-1 cursor-pointer hover:text-blue-500 relative group/boundary">
          |
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 translate-y-1 pb-2 hidden group-hover/boundary:flex flex-col z-10">
            <div className="flex flex-col gap-1 bg-white shadow-lg rounded p-1 border border-gray-200 whitespace-nowrap">
              <button
                className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left text-gray-900"
                onClick={() => nextSentenceId && splitParagraph(paragraphId, nextSentenceId)}
              >
                Разьбіць на абзацы
              </button>
            </div>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1 pt-2 hidden group-hover/boundary:flex flex-col z-10">
            <div className="flex flex-col gap-1 bg-white shadow-lg rounded p-1 border border-gray-200 whitespace-nowrap">
              <button
                className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left text-red-600"
                onClick={() => joinSentence(paragraphId, sentence.id)}
              >
                Аб'яднаць сказы
              </button>
            </div>
          </div>
        </span>
      )}
    </span>
  );
}
