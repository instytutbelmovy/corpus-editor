import { useDocumentStore } from '../store';
import { useUIStore } from '../uiStore';
import { BUTTON_STYLES } from '../styles';

export function Toolbar() {
  const {
    undo,
    redo,
    saveEditing,
    cancelEditing,
    historyIndex,
    history,
    pendingOperations,
    loading
  } = useDocumentStore();

  const { isStructureEditingMode, setIsStructureEditingMode, isEditingText } = useUIStore();

  const hasChanges = pendingOperations.length > 0;
  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  if (!isStructureEditingMode) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 bg-white p-2 rounded shadow border border-gray-200 mb-4">
      <button
        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm disabled:opacity-50 flex items-center gap-1"
        onClick={() => {
          if (isEditingText && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          undo();
        }}
        onMouseDown={(e) => e.preventDefault()}
        disabled={!canUndo}
        title="Адрабіць"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
        Адрабіць
      </button>
      <button
        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm disabled:opacity-50 flex items-center gap-1"
        onClick={() => {
          if (isEditingText && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          redo();
        }}
        onMouseDown={(e) => e.preventDefault()}
        disabled={!canRedo}
        title="Узнавіць"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
        Узнавіць
      </button>
      <div className="h-4 w-px bg-gray-300 mx-2" />
      <button
        className={`px-3 py-1 rounded text-sm ${BUTTON_STYLES.primary}`}
        onClick={saveEditing}
        disabled={!hasChanges || loading}
      >
        {loading ? 'Захоўваецца...' : 'Захаваць'}
      </button>
      <button
        className={`px-3 py-1 rounded text-sm ${BUTTON_STYLES.secondary}`}
        onClick={() => {
          cancelEditing();
          setIsStructureEditingMode(false);
        }}
      >
        Скасаваць
      </button>
    </div>
  );
}
