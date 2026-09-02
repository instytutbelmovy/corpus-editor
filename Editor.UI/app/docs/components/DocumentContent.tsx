import { DocumentData, SelectedWord } from '../types';
import { Paragraph } from './Paragraph';
import { LoadingIndicator } from './LoadingIndicator';
import { useUIStore } from '../uiStore';

export type WordClickHandler = (
  paragraphId: number,
  sentenceId: number,
  wordIndex: number
) => void;

interface DocumentContentProps {
  documentData: DocumentData;
  selectedWord: SelectedWord | null;
  pendingSaves: Set<string>;
  loadingMore: boolean;
  hasMore: boolean;
  onWordClick: WordClickHandler;
  observerRef: React.RefObject<HTMLDivElement | null>;
}

export function DocumentContent({
  documentData,
  selectedWord,
  pendingSaves,
  loadingMore,
  hasMore,
  onWordClick,
  observerRef,
}: DocumentContentProps) {
  const { isStructureEditingMode } = useUIStore();

  return (
    <div>
      {documentData.paragraphs.map((paragraph, index) => (
        <Paragraph
          key={paragraph.id}
          paragraph={paragraph}
          selectedWord={selectedWord}
          pendingSaves={pendingSaves}
          onWordClick={onWordClick}
          isStructureEditingMode={isStructureEditingMode}
          index={index}
        />
      ))}

      <div ref={observerRef}>
        <LoadingIndicator
          loadingMore={loadingMore}
          hasMore={hasMore}
          paragraphsCount={documentData.paragraphs.length}
        />
      </div>
    </div>
  );
}
