import { Paragraph as ParagraphType, SelectedWord } from '../types';
import { Sentence } from './Sentence';
import { useDocumentStore } from '../store';
import { HoverMenu } from './HoverMenu';
import { WordClickHandler } from './DocumentContent';

interface ParagraphProps {
  paragraph: ParagraphType;
  selectedWord: SelectedWord | null;
  pendingSaves: Set<string>;
  onWordClick: WordClickHandler;
  isStructureEditingMode: boolean;
  index: number;
}

export function Paragraph({
  paragraph,
  selectedWord,
  pendingSaves,
  onWordClick,
  isStructureEditingMode,
  index,
}: ParagraphProps) {
  // У рэжыме структуры чаргуем фон, каб межы абзацаў былі відаць
  const bgClass =
    isStructureEditingMode && index % 2 !== 0
      ? 'bg-gray-100 rounded p-2 -mx-2'
      : '';

  return (
    <div className={`mb-4 ${bgClass}`}>
      {paragraph.sentences.map((sentence, sentenceIndex) => (
        <span key={sentence.id}>
          <Sentence
            sentence={sentence}
            paragraphId={paragraph.id}
            selectedWord={selectedWord}
            pendingSaves={pendingSaves}
            onWordClick={onWordClick}
            isStructureEditingMode={isStructureEditingMode}
            index={sentenceIndex}
            isLastSentence={sentenceIndex === paragraph.sentences.length - 1}
            nextSentenceId={paragraph.sentences[sentenceIndex + 1]?.id}
          />
          {sentenceIndex < paragraph.sentences.length - 1 && ' '}
        </span>
      ))}
      {isStructureEditingMode && (
        <ParagraphBoundary paragraphId={paragraph.id} />
      )}
    </div>
  );
}

function ParagraphBoundary({ paragraphId }: { paragraphId: number }) {
  const { joinParagraph } = useDocumentStore();

  return (
    <HoverMenu
      group="boundary"
      marker="¶"
      markerClassName="text-gray-400 select-none ml-1 cursor-pointer hover:text-blue-500 px-1"
      below={[
        {
          label: "Аб'яднаць абзацы",
          danger: true,
          highlightMarkerOnHover: true,
          onClick: () => joinParagraph(paragraphId),
        },
      ]}
    />
  );
}
