import { useState } from 'react';
import { useDocumentStore } from '../store';
import { useAddItem } from '../hooks/useAddItem';
import { HoverMenu, HoverMenuItem } from './HoverMenu';

interface InteractiveSpaceProps {
  canGlue: boolean;
  isLastItem?: boolean;
  paragraphId: number;
  sentenceId: number;
  itemIndex: number;
}

// Прабел паміж элемэнтамі ў рэжыме рэдагаваньня структуры
export function InteractiveSpace({
  canGlue,
  isLastItem,
  paragraphId,
  sentenceId,
  itemIndex,
}: InteractiveSpaceProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { splitSentence, addLineBreak, setGlue } = useDocumentStore();
  const { handleAddWord, handleAddPunctuation } = useAddItem();

  const run = (action: () => void) => () => {
    action();
    setIsMenuOpen(false);
  };

  const above: HoverMenuItem[] = [
    {
      label: 'Дадаць слова',
      onClick: run(() => handleAddWord(paragraphId, sentenceId, itemIndex)),
    },
    {
      label: 'Дадаць пунктуацыю',
      onClick: run(() =>
        handleAddPunctuation(paragraphId, sentenceId, itemIndex)
      ),
    },
  ];

  if (!isLastItem) {
    above.push(
      {
        label: 'Разьбіць на сказы',
        onClick: run(() => splitSentence(paragraphId, sentenceId, itemIndex)),
      },
      {
        label: 'Дадаць перанос',
        onClick: run(() => addLineBreak(paragraphId, sentenceId, itemIndex)),
      }
    );
  }

  return (
    <HoverMenu
      group="start"
      marker="&nbsp;"
      markerClassName="inline-block w-1 text-center cursor-pointer hover:bg-blue-200 px-0.5 rounded"
      isOpen={isMenuOpen}
      onMouseEnter={() => setIsMenuOpen(true)}
      onMouseLeave={() => setIsMenuOpen(false)}
      above={above}
      below={
        canGlue
          ? [
              {
                label: 'Выдаліць',
                danger: true,
                highlightMarkerOnHover: true,
                onClick: run(() =>
                  setGlue(paragraphId, sentenceId, itemIndex, true)
                ),
              },
            ]
          : undefined
      }
    />
  );
}
