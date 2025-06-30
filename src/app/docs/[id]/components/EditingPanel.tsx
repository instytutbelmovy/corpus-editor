import { SelectedWord, ParadigmFormId } from '@/types/document';

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

          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2">
              Варыянты парадыгмы:
            </div>
            <div className="space-y-2 overflow-y-auto lg:overflow-visible">
              {selectedWord.options.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="text-2xl mb-2">📝</div>
                  <p>Няма даступных варыянтаў парадыгмы для гэтага слова</p>
                </div>
              ) : (
                selectedWord.options.map(option => {
                  const isSelected =
                    selectedWord.item.paradigmFormId &&
                    selectedWord.item.paradigmFormId.paradigmId ===
                      option.paradigmFormId.paradigmId &&
                    selectedWord.item.paradigmFormId.variantId ===
                      option.paradigmFormId.variantId &&
                    selectedWord.item.paradigmFormId.formTag ===
                      option.paradigmFormId.formTag;

                  return (
                    <div
                      key={`${option.paradigmFormId.paradigmId}-${option.paradigmFormId.variantId}-${option.paradigmFormId.formTag}`}
                      className={`border rounded-lg p-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => onSaveParadigm(option.paradigmFormId)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-1">
                            {option.normalizedLemma}
                          </div>
                          <div className="text-sm text-gray-600 mb-1">
                            {option.linguisticTag.paradigmTag}
                            {option.linguisticTag.formTag &&
                              ` (${option.linguisticTag.formTag})`}
                          </div>
                          {option.meaning && (
                            <div className="text-sm text-gray-500 italic">
                              {option.meaning}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="ml-2 text-green-500">
                            <svg
                              className="w-5 h-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
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
