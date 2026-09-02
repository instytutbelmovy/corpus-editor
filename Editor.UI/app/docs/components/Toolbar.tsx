import { useMemo } from 'react';
import { useDocumentStore } from '../store';
import { useUIStore } from '../uiStore';
import { Button } from '@/app/components';
import { RedoIcon, UndoIcon } from '@/app/components/icons';

export function Toolbar() {
  const {
    undo,
    redo,
    saveEditing,
    cancelEditing,
    historyIndex,
    history,
    hasChanges,
    documentData,
    originalDocumentData,
    loading,
  } = useDocumentStore();

  const {
    isStructureEditingMode,
    setIsStructureEditingMode,
    isStructureTextEditing,
  } = useUIStore();

  // hasChanges() JSON.stringify'іць кожны абзац — лічым толькі калі мяняюцца самі дакумэнты, не на кожны рэндар.
  // documentData/originalDocumentData не выкарыстоўваюцца ў целе — hasChanges() чытае іх сам з стору, але яны трэба ў залежнасьцях, каб useMemo пералічваў пры іх зьмене
  const changed = useMemo(
    () => hasChanges(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasChanges, documentData, originalDocumentData]
  );

  if (!isStructureEditingMode) {
    return null;
  }

  // Пры праўцы тэксту здымаем фокус, каб onBlur пасьпеў зафіксаваць зьмену да undo/redo
  const withBlur = (action: () => void) => () => {
    if (
      isStructureTextEditing &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    action();
  };

  return (
    <div className="flex items-center gap-2 bg-white p-2 rounded shadow border border-gray-200 mb-4">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1"
        onClick={withBlur(undo)}
        onMouseDown={event => event.preventDefault()}
        disabled={historyIndex < 0}
        title="Адрабіць"
      >
        <UndoIcon />
        Адрабіць
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1"
        onClick={withBlur(redo)}
        onMouseDown={event => event.preventDefault()}
        disabled={historyIndex >= history.length - 1}
        title="Узнавіць"
      >
        <RedoIcon />
        Узнавіць
      </Button>
      <div className="h-4 w-px bg-gray-300 mx-2" />
      <Button
        size="sm"
        onClick={saveEditing}
        disabled={!changed || loading}
        loading={loading}
        loadingText="Захоўваецца..."
      >
        Захаваць
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          cancelEditing();
          setIsStructureEditingMode(false);
        }}
      >
        Скасаваць
      </Button>
    </div>
  );
}
