import {
  DocumentData,
  SelectedWord,
  LinguisticItem as LinguisticItemType,
} from '../types';
import { Paragraph } from './Paragraph';
import { LoadingIndicator } from './LoadingIndicator';

import { useUIStore } from '../uiStore';

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
  const { isStructureEditingMode } = useUIStore();

  return (
    <div className="prose max-w-none">
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
