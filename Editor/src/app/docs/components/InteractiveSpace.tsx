import { useState } from 'react';
import { useDocumentStore } from '../store';
import { useAddItem } from '../hooks/useAddItem';

interface InteractiveSpaceProps {
  canGlue: boolean;
  isLastItem?: boolean;
  paragraphId: number;
  sentenceId: number;
  itemIndex: number;
}

export function InteractiveSpace({ canGlue, isLastItem, paragraphId, sentenceId, itemIndex }: InteractiveSpaceProps) {
  const [isDeleteHovered, setIsDeleteHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { splitSentence, addLineBreak, setGlue } = useDocumentStore();
  const { handleAddWord, handleAddPunctuation } = useAddItem();

  return (
    <span
      className={`relative group/space inline-block w-1 text-center cursor-pointer hover:bg-blue-200 px-0.5 rounded ${isDeleteHovered ? '!bg-red-100' : ''}`}
      onMouseEnter={() => setIsMenuOpen(true)}
      onMouseLeave={() => setIsMenuOpen(false)}
    >
      &nbsp;
      <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 translate-y-1 pb-2 ${isMenuOpen ? 'flex' : 'hidden'} flex-col z-10 min-w-[150px]`}>
        <div className="flex flex-col gap-1 bg-white shadow-lg rounded p-1 border border-gray-200 whitespace-nowrap">
          <button
            className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left"
            onClick={() => {
              handleAddWord(paragraphId, sentenceId, itemIndex);
              setIsMenuOpen(false);
            }}
          >
            Дадаць слова
          </button>
          <button
            className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left"
            onClick={() => {
              handleAddPunctuation(paragraphId, sentenceId, itemIndex);
              setIsMenuOpen(false);
            }}
          >
            Дадаць пунктуацыю
          </button>
          {!isLastItem && (
            <>
              <button
                className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left"
                onClick={() => {
                  splitSentence(paragraphId, sentenceId, itemIndex);
                  setIsMenuOpen(false);
                }}
              >
                Разьбіць на сказы
              </button>
              <button
                className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left"
                onClick={() => {
                  addLineBreak(paragraphId, sentenceId, itemIndex);
                  setIsMenuOpen(false);
                }}
              >
                Дадаць перанос
              </button>
            </>
          )}
        </div>
      </div>
      {/* Glue option at the bottom */}
      {canGlue && (
        <div className={`absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1 pt-2 ${isMenuOpen ? 'flex' : 'hidden'} flex-col z-10 min-w-[150px]`}>
          <div className="flex flex-col gap-1 bg-white shadow-lg rounded p-1 border border-gray-200 whitespace-nowrap">
            <button
              className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left text-red-600"
              onMouseEnter={() => setIsDeleteHovered(true)}
              onMouseLeave={() => setIsDeleteHovered(false)}
              onClick={() => {
                setGlue(paragraphId, sentenceId, itemIndex, true);
                setIsMenuOpen(false);
              }}
            >
              Выдаліць
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
