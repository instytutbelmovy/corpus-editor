import { useEffect, useMemo, useState } from 'react';
import {
  SelectedWord,
  ParadigmFormId,
  LinguisticTag,
  LinguisticErrorType,
} from '../types';
import { parseTagCodes } from '../linguisticCategories';
import { wordKey } from '../wordEditing';
import { useUIStore } from '../uiStore';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { ParadigmOptions } from './ParadigmOptions';
import { SettingsButton } from './SettingsButton';
import {
  ManualLinguisticInput,
  ManualInputValues,
} from './ManualLinguisticInput';
import { WordTitle } from './WordTitle';
import { ErrorTypeSelect } from './ErrorTypeSelect';
import { CommentField } from './CommentField';
import { Alert } from '@/app/components';
import { CloseIcon, WarningIcon } from '@/app/components/icons';

// Аўтазахаваньне камэнтара пасьля паўзы ва ўводзе
const COMMENT_SAVE_DELAY_MS = 1000;

interface EditingPanelProps {
  selectedWord: SelectedWord | null;
  saveError: string | null;
  onClose: () => void;
  onSaveParadigm: (paradigmFormId: ParadigmFormId) => Promise<void>;
  onClearError: () => void;
  onUpdateWordText?: (text: string) => Promise<void>;
  onSaveManualCategories?: (
    lemma: string,
    linguisticTag: LinguisticTag
  ) => Promise<void>;
  onSaveComment?: (comment: string) => Promise<void>;
  onSaveErrorType?: (errorType: LinguisticErrorType) => Promise<void>;
}

export function EditingPanel({
  selectedWord,
  saveError,
  onClose,
  onSaveParadigm,
  onClearError,
  onUpdateWordText,
  onSaveManualCategories,
  onSaveComment,
  onSaveErrorType,
}: EditingPanelProps) {
  const displayMode = useUIStore(state => state.displayMode);
  const setDisplayMode = useUIStore(state => state.setDisplayMode);
  const isSavingText = useUIStore(state => state.isSavingText);
  const isSavingManual = useUIStore(state => state.isSavingManual);
  const isSavingError = useUIStore(state => state.isSavingError);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showErrorDropdown, setShowErrorDropdown] = useState(false);

  const errorType =
    selectedWord?.item.metadata?.errorType ?? LinguisticErrorType.None;
  const showErrorType = Boolean(errorType) || showErrorDropdown;

  // Ключ слова, а не сам аб'ект: фонавыя захаваньні перастварваюць selectedWord
  const selectedKey = selectedWord ? wordKey(selectedWord) : '';

  const {
    value: comment,
    change: changeComment,
    flush: saveCommentImmediately,
    isSaving: isSavingComment,
  } = useDebouncedSave({
    value: selectedWord?.item.comment ?? '',
    resetKey: selectedKey,
    onSave: onSaveComment,
    delayMs: COMMENT_SAVE_DELAY_MS,
  });

  // Слова, разьмечанае ўручную: тэг ёсьць, а парадыгмы няма
  const isManuallyEdited =
    selectedWord !== null &&
    selectedWord.item.paradigmFormId === null &&
    selectedWord.item.linguisticTag !== null &&
    Boolean(selectedWord.item.metadata?.resolvedOn);

  // Скідаем толькі пры пераходзе на іншае слова: праўка тэксту таго ж слова мяняе isManuallyEdited (тэкст-праўка скідае тэг), але не павінна закрываць сьпіс тыпаў памылкі
  useEffect(() => {
    setShowErrorDropdown(false);
  }, [selectedKey]);

  useEffect(() => {
    setShowManualInput(isManuallyEdited);
  }, [selectedKey, isManuallyEdited]);

  // Пачатковыя значэньні ручнога ўводу - коды з ужо існага тэгу
  const manualValues = useMemo((): ManualInputValues | null => {
    const item = selectedWord?.item;
    if (!item?.linguisticTag || !item.lemma) return null;

    const { partOfSpeech = '', ...categories } = parseTagCodes(
      item.linguisticTag
    );
    return { lemma: item.lemma, partOfSpeech, categories };
  }, [selectedWord]);

  if (!selectedWord) {
    // На дэсктопе паказваем пустую панэль, на мабільным не паказваем
    return (
      <div className="hidden lg:block lg:static lg:w-80 lg:h-full lg:border-l lg:border-gray-200 lg:bg-gray-50 lg:p-4">
        <div className="text-center text-gray-500 py-8">
          <div className="text-2xl mb-2">📝</div>
          <p className="text-sm">Выберыце слова для рэдагаваньня</p>
        </div>
      </div>
    );
  }

  const handleSaveManualInput = async (
    lemma: string,
    linguisticTag: LinguisticTag
  ) => {
    if (!onSaveManualCategories) return;
    try {
      await saveCommentImmediately();
      await onSaveManualCategories(lemma, linguisticTag);
      // Вяртаемся да сьпісу варыянтаў; кнопка ручнога ўводу застаецца даступнай
      setShowManualInput(false);
    } catch (error) {
      console.error('Памылка захаваньня лінгвістычных катэгорый:', error);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full h-2/3 bg-white border-t border-gray-200 shadow-2xl z-50 rounded-t-2xl overflow-y-auto lg:sticky lg:top-6 lg:w-80 lg:h-[calc(100vh-3rem)] lg:border-t-0 lg:border-l lg:border-r-0 lg:border-b-0 lg:rounded-none lg:shadow-none">
      <div className="p-4">
        <WordTitle
          key={selectedKey}
          text={selectedWord.item.text}
          isSaving={isSavingText}
          onSave={onUpdateWordText}
          actions={
            <>
              {onSaveErrorType && !showErrorType && (
                <button
                  onClick={() => setShowErrorDropdown(true)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Пазначыць памылку"
                >
                  <WarningIcon />
                </button>
              )}
              <SettingsButton
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
              />
              <button
                onClick={async () => {
                  await saveCommentImmediately();
                  onClose();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                title="Закрыць"
              >
                <CloseIcon />
              </button>
            </>
          }
        />

        <div className="mb-4">
          {onSaveErrorType && showErrorType && (
            <ErrorTypeSelect
              value={errorType}
              isSaving={isSavingError}
              onChange={newErrorType => {
                onSaveErrorType(newErrorType);
                // Пасьля скіданьня тыпу пакідаем сьпіс адкрытым
                if (newErrorType === LinguisticErrorType.None) {
                  setShowErrorDropdown(true);
                }
              }}
            />
          )}

          <div className="overflow-y-auto lg:overflow-visible">
            {showManualInput ? (
              <ManualLinguisticInput
                key={selectedKey}
                onSave={handleSaveManualInput}
                onCancel={() => setShowManualInput(false)}
                isSaving={isSavingManual}
                initialValues={manualValues}
              />
            ) : (
              <ParadigmOptions
                options={selectedWord.options}
                selectedParadigmFormId={selectedWord.item.paradigmFormId}
                selectedItem={selectedWord.item}
                displayMode={displayMode}
                onSelect={onSaveParadigm}
                onManualInput={
                  onSaveManualCategories
                    ? () => setShowManualInput(true)
                    : undefined
                }
                onBeforeSelect={saveCommentImmediately}
                onSaveManualCategories={onSaveManualCategories}
              />
            )}
          </div>
        </div>

        <CommentField
          value={comment}
          isSaving={isSavingComment}
          onChange={changeComment}
        />

        {saveError && (
          <Alert title="Памылка захаваньня:" onClose={onClearError}>
            {saveError}
          </Alert>
        )}
      </div>
    </div>
  );
}
