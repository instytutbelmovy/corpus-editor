import { ReactNode, useEffect, useState } from 'react';
import { PencilIcon } from '@/app/components/icons';

interface WordTitleProps {
  text: string;
  isSaving: boolean;
  onSave?: (text: string) => Promise<void>;
  // Кнопкі справа; хаваюцца, пакуль ідзе праўка тэксту
  actions: ReactNode;
}

// Загаловак панэлі: тэкст слова і яго праўка на месцы
export function WordTitle({ text, isSaving, onSave, actions }: WordTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    setIsEditing(false);
    setEditText('');
  }, [text]);

  const cancel = () => {
    setIsEditing(false);
    setEditText('');
  };

  const save = async () => {
    if (!onSave || editText.trim() === '') return;
    try {
      await onSave(editText.trim());
      cancel();
    } catch (error) {
      console.error('Памылка захаваньня тэксту:', error);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center space-x-2 mb-4">
        <input
          type="text"
          value={editText}
          // «+» ставіць знак націску на папярэднюю літару
          onChange={e => setEditText(e.target.value.replace(/\+/g, '́'))}
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Увядзіце новы тэкст"
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') save();
            else if (e.key === 'Escape') cancel();
          }}
        />
        <button
          onClick={save}
          disabled={isSaving || editText.trim() === ''}
          className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? '...' : '✓'}
        </button>
        <button
          onClick={cancel}
          disabled={isSaving}
          className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2 flex-1">
        <h3 className="text-lg font-semibold text-gray-900">{text}</h3>
        {onSave && (
          <button
            onClick={() => {
              setEditText(text);
              setIsEditing(true);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            title="Рэдагаваць тэкст"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex items-center space-x-2">{actions}</div>
    </div>
  );
}
