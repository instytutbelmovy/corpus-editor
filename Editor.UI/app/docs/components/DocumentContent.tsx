import { DocumentData } from '../types';
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
  loadingMore: boolean;
  hasMore: boolean;
  onWordClick: WordClickHandler;
  observerRef: React.RefObject<HTMLDivElement | null>;
}

export function DocumentContent({
  documentData,
  loadingMore,
  hasMore,
  onWordClick,
  observerRef,
}: DocumentContentProps) {
  const isStructureEditingMode = useUIStore(
    state => state.isStructureEditingMode
  );

  return (
    <div>
      {documentData.paragraphs.map((paragraph, index) => (
        <Paragraph
          key={paragraph.id}
          paragraph={paragraph}
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
