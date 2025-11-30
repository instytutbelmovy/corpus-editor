import {
  Paragraph as ParagraphType,
  SelectedWord,
  LinguisticItem as LinguisticItemType,
} from '../types';
import { Sentence } from './Sentence';
import { useState } from 'react';

interface ParagraphProps {
  paragraph: ParagraphType;
  selectedWord: SelectedWord | null;
  pendingSaves: Set<string>;
  onWordClick: (item: LinguisticItemType) => void;
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
  const bgClass = isStructureEditingMode && index % 2 !== 0 ? 'bg-gray-100 rounded p-2 -mx-2' : '';

  return (
    <div key={paragraph.id} className={`mb-4 ${bgClass}`}>
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
          />
          {sentenceIndex < paragraph.sentences.length - 1 && ' '}
        </span>
      ))}
      {isStructureEditingMode && (
        <ParagraphBoundary />
      )}
    </div>
  );
}

function ParagraphBoundary() {
  const [isMergeHovered, setIsMergeHovered] = useState(false);

  return (
    <span className={`text-gray-400 select-none ml-1 cursor-pointer hover:text-blue-500 relative group/boundary px-1 ${isMergeHovered ? '!bg-red-100 rounded' : ''}`}>
      ¶
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1 pt-2 hidden group-hover/boundary:flex flex-col z-10">
        <div className="flex flex-col gap-1 bg-white shadow-lg rounded p-1 border border-gray-200 whitespace-nowrap">
          <button
            className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left text-red-600"
            onMouseEnter={() => setIsMergeHovered(true)}
            onMouseLeave={() => setIsMergeHovered(false)}
          >
            Аб'яднаць абзацы
          </button>
        </div>
      </div>
    </span>
  );
}
