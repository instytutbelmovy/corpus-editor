import { SelectedWord, ParadigmFormId } from '@/types/document';
import { useDisplaySettings } from '../hooks/useDisplaySettings';
import { ParadigmOptions, SettingsButton } from './index';
import { useState } from 'react';

interface EditingPanelProps {
  selectedWord: SelectedWord | null;
  saveError: string | null;
  onClose: () => void;
  onSaveParadigm: (paradigmFormId: ParadigmFormId) => void;
  onClearError: () => void;
  onUpdateWordText?: (text: string) => Promise<void>;
}

export function EditingPanel({
  selectedWord,
  saveError,
  onClose,
  onSaveParadigm,
  onClearError,
  onUpdateWordText,
}: EditingPanelProps) {
  const { displayMode, setDisplayMode } = useDisplaySettings();
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState('');
  const [isSavingText, setIsSavingText] = useState(false);

  // Пачынаем рэдагаванне тэксту
  const handleStartEditText = () => {
    if (selectedWord) {
      setEditText(selectedWord.item.text);
      setIsEditingText(true);
    }
  };

  // Захоўваем зменены тэкст
  const handleSaveText = async () => {
    if (!onUpdateWordText || !selectedWord || editText.trim() === '') return;

    setIsSavingText(true);
    try {
      await onUpdateWordText(editText.trim());
      setIsEditingText(false);
      setEditText('');
    } catch (error) {
      console.error('Памылка захавання тэксту:', error);
    } finally {
      setIsSavingText(false);
    }
  };

  // Скасоўваем рэдагаванне
  const handleCancelEditText = () => {
    setIsEditingText(false);
    setEditText('');
  };

  if (!selectedWord) {
    // На дэсктопе паказваем пустую панэль, на мабільным не паказваем
    return (
      <div className="hidden lg:block lg:w-80 lg:min-h-screen lg:border-l lg:border-gray-200 lg:bg-gray-50 lg:p-4">
        <div className="text-center text-gray-500 py-8">
          <div className="text-2xl mb-2">📝</div>
          <p className="text-sm">Выберыце слова для рэдагавання</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Фон для overlay на мабільных */}
      <div
        className="fixed inset-0 z-40 pointer-events-none lg:hidden"
        aria-hidden="true"
      />
      <div
        className="fixed bottom-0 left-0 w-full h-2/3 bg-white border-t border-gray-200 shadow-2xl z-50 rounded-t-2xl overflow-y-auto lg:static lg:h-auto lg:w-80 lg:min-h-screen lg:border-t-0 lg:border-l lg:border-r-0 lg:border-b-0 lg:rounded-none lg:shadow-none"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              {isEditingText ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Увядзіце новы тэкст"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleSaveText();
                      } else if (e.key === 'Escape') {
                        handleCancelEditText();
                      }
                    }}
                  />
                  <button
                    onClick={handleSaveText}
                    disabled={isSavingText || editText.trim() === ''}
                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingText ? '...' : '✓'}
                  </button>
                  <button
                    onClick={handleCancelEditText}
                    disabled={isSavingText}
                    className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedWord.item.text}
                  </h3>
                  {onUpdateWordText && (
                    <button
                      onClick={handleStartEditText}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                      title="Рэдагаваць тэкст"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <SettingsButton
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
              />
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                title="Закрыць"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="overflow-y-auto lg:overflow-visible">
              <ParadigmOptions
                options={selectedWord.options}
                selectedParadigmFormId={selectedWord.item.paradigmFormId}
                displayMode={displayMode}
                onSelect={onSaveParadigm}
              />
            </div>
          </div>

          {saveError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 flex-1">
                  <div className="text-red-500 text-lg">❌</div>
                  <div>
                    <div className="text-sm font-medium text-red-800 mb-1">
                      Памылка захавання:
                    </div>
                    <div className="text-sm text-red-700">{saveError}</div>
                  </div>
                </div>
                <button
                  onClick={onClearError}
                  className="text-red-400 hover:text-red-600 transition-colors p-1 ml-2"
                  title="Закрыць"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
