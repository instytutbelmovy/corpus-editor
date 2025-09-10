import {
  Paragraph as ParagraphType,
  SelectedWord,
  LinguisticItem as LinguisticItemType,
} from '../types';
import { Sentence } from './Sentence';

interface ParagraphProps {
  paragraph: ParagraphType;
  selectedWord: SelectedWord | null;
  pendingSaves: Set<string>;
  onWordClick: (item: LinguisticItemType) => void;
}

export function Paragraph({
  paragraph,
  selectedWord,
  pendingSaves,
  onWordClick,
}: ParagraphProps) {
  return (
    <div key={paragraph.id} className="mb-4">
      {paragraph.sentences.map((sentence, sentenceIndex) => (
        <span key={sentence.id}>
          <Sentence
            sentence={sentence}
            paragraphId={paragraph.id}
            selectedWord={selectedWord}
            pendingSaves={pendingSaves}
            onWordClick={onWordClick}
          />
          {sentenceIndex < paragraph.sentences.length - 1 && ' '}
        </span>
      ))}
    </div>
  );
}
