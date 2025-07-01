import {
  DocumentData,
  SelectedWord,
  LinguisticItem as LinguisticItemType,
} from '@/types/document';
import { Paragraph } from './Paragraph';
import { LoadingIndicator } from './LoadingIndicator';

interface DocumentContentProps {
  documentData: DocumentData;
  selectedWord: SelectedWord | null;
  pendingSaves: Set<string>;
  loadingMore: boolean;
  hasMore: boolean;
  onWordClick: (item: LinguisticItemType) => void;
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
  return (
    <div className="flex-1 prose max-w-none">
      {documentData.paragraphs.map(paragraph => (
        <Paragraph
          key={paragraph.id}
          paragraph={paragraph}
          selectedWord={selectedWord}
          pendingSaves={pendingSaves}
          onWordClick={onWordClick}
        />
      ))}

      {/* Індыкатар загрузкі */}
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
