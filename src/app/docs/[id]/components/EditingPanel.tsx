import { SelectedWord, ParadigmFormId } from '@/types/document';
import { useDisplaySettings } from '../hooks/useDisplaySettings';
import { ParadigmOptions, SettingsButton } from './index';

interface EditingPanelProps {
  selectedWord: SelectedWord | null;
  saveError: string | null;
  onClose: () => void;
  onSaveParadigm: (paradigmFormId: ParadigmFormId) => void;
  onClearError: () => void;
}

export function EditingPanel({
  selectedWord,
  saveError,
  onClose,
  onSaveParadigm,
  onClearError,
}: EditingPanelProps) {
  const { displayMode, setDisplayMode } = useDisplaySettings();

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
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedWord.item.text}
            </h3>
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
