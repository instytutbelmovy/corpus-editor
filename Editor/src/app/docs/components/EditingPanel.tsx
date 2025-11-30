import {
  SelectedWord,
  ParadigmFormId,
  LinguisticTag,
  LinguisticErrorType,
} from '../types';
import { parseLinguisticTag } from '../linguisticCategories';
import { useDisplaySettings } from '../hooks/useDisplaySettings';
import {
  ParadigmOptions,
  SettingsButton,
  ManualLinguisticInput,
} from './index';
import { useState, useEffect, useRef, useCallback } from 'react';

interface EditingPanelProps {
  selectedWord: SelectedWord | null;
  saveError: string | null;
  onClose: () => void;
  onSaveParadigm: (paradigmFormId: ParadigmFormId) => void;
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
  const { displayMode, setDisplayMode, isSavingError } = useDisplaySettings();
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState('');
  const [isSavingText, setIsSavingText] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [comment, setComment] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const commentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedCommentRef = useRef<string>('');
  const [showErrorDropdown, setShowErrorDropdown] = useState(false);

  useEffect(() => {
    setShowErrorDropdown(false);
  }, [selectedWord?.paragraphId, selectedWord?.sentenceId, selectedWord?.wordIndex]);

  const hasError = !!selectedWord?.item.metadata?.errorType;
  const showDropdown = hasError || showErrorDropdown;

  // Вызначаем, ці было слова адрэдагавана ў ручным рэжыме
  const isManuallyEdited =
    selectedWord &&
    selectedWord.item.paradigmFormId === null &&
    selectedWord.item.linguisticTag !== null &&
    !!selectedWord.item.metadata?.resolvedOn;

  // Ініцыялізуем ручны ўвод, калі слова было адрэдагавана ўручную
  useEffect(() => {
    if (isManuallyEdited && selectedWord?.item.linguisticTag) {
      setShowManualInput(true);
    } else {
      setShowManualInput(false);
    }
  }, [selectedWord, isManuallyEdited]);

  // Скідаем стан рэдагаваньня тэксту пры змене выбраннага слова
  useEffect(() => {
    setIsEditingText(false);
    setEditText('');
  }, [selectedWord]);

  // Захоўваем камэнтар неадкладна (пры пераходзе на наступнае слова)
  const saveCommentImmediately = useCallback(async () => {
    if (
      onSaveComment &&
      selectedWord &&
      comment !== lastSavedCommentRef.current
    ) {
      // Скідаем таймаут, калі ён ёсць
      if (commentTimeoutRef.current) {
        clearTimeout(commentTimeoutRef.current);
      }
      setIsSavingComment(true);
      try {
        await onSaveComment(comment);
        lastSavedCommentRef.current = comment;
      } catch (error) {
        console.error('Памылка захаваньня камэнтара:', error);
      } finally {
        setIsSavingComment(false);
      }
    }
  }, [onSaveComment, selectedWord, comment]);

  // Ініцыялізуем камэнтар пры змене выбраннага слова
  useEffect(() => {
    if (selectedWord) {
      const newComment = selectedWord.item.comment || '';
      setComment(newComment);
      lastSavedCommentRef.current = newComment;
    } else {
      setComment('');
      lastSavedCommentRef.current = '';
    }
  }, [selectedWord]);

  // Пачынаем рэдагаваньне тэксту
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
      console.error('Памылка захаваньня тэксту:', error);
    } finally {
      setIsSavingText(false);
    }
  };

  // Скасоўваем рэдагаваньне
  const handleCancelEditText = () => {
    setIsEditingText(false);
    setEditText('');
  };

  // Захоўваем ручна ўведзеныя катэгорыі
  const handleSaveManualInput = async (
    lemma: string,
    linguisticTag: LinguisticTag
  ) => {
    if (!onSaveManualCategories) return;

    setIsSavingManual(true);
    try {
      await saveCommentImmediately(); // Захоўваем камэнтар перад пераходам
      await onSaveManualCategories(lemma, linguisticTag);
      setShowManualInput(false);
      // Пасля захаваньня мы вяртаемся да выбару прапанаваных опцый
      // Але слова цяпер пазначана як адрэдагаванае ўручную
      // Кнопка "Вярнуцца да ручнага ўводу" будзе даступная
    } catch (error) {
      console.error('Памылка захаваньня лінгвістычных катэгорый:', error);
    } finally {
      setIsSavingManual(false);
    }
  };

  // Скасоўваем ручны ўвод
  const handleCancelManualInput = () => {
    setShowManualInput(false);
    // Калі слова было адрэдагавана ўручную, то пры скасаваньні мы вяртаемся да выбару прапанаваных опцый
    // Але не скідваем існуючыя значэньні, каб карыстальнік мог іх зноў выкарыстаць
    // Кнопка "Вярнуцца да ручнага ўводу" будзе даступная
  };

  // Захоўваем камэнтар з дэбаўнсінгам
  const handleCommentChange = (newComment: string) => {
    setComment(newComment);

    // Скідаем папярэдні таймаут
    if (commentTimeoutRef.current) {
      clearTimeout(commentTimeoutRef.current);
    }

    // Усталёўваем новы таймаут для аўтазахаваньня праз 1 секунду
    commentTimeoutRef.current = setTimeout(async () => {
      if (
        onSaveComment &&
        selectedWord &&
        newComment !== lastSavedCommentRef.current
      ) {
        setIsSavingComment(true);
        try {
          await onSaveComment(newComment);
          lastSavedCommentRef.current = newComment;
        } catch (error) {
          console.error('Памылка захаваньня камэнтара:', error);
        } finally {
          setIsSavingComment(false);
        }
      }
    }, 1000);
  };

  // Ачыстка таймаута пры размаўтаньні кампанента
  useEffect(() => {
    return () => {
      if (commentTimeoutRef.current) {
        clearTimeout(commentTimeoutRef.current);
      }
    };
  }, []);

  // Атрымліваем існуючыя значэньні для ручнага ўводу
  const getExistingManualValues = () => {
    if (!selectedWord?.item.linguisticTag || !selectedWord?.item.lemma) {
      return null;
    }

    const categories = parseLinguisticTag(selectedWord.item.linguisticTag);

    // Пераўтвараем катэгорыі ў фармат, які патрабуе ManualLinguisticInput
    const categoryValues: Record<string, string> = {};

    // Знаходзім частку мовы
    let partOfSpeech = '';
    if (categories.partOfSpeech === 'назоўнік') partOfSpeech = 'N';
    else if (categories.partOfSpeech === 'прыметнік') partOfSpeech = 'A';
    else if (categories.partOfSpeech === 'лічэбнік') partOfSpeech = 'M';
    else if (categories.partOfSpeech === 'займеньнік') partOfSpeech = 'S';
    else if (categories.partOfSpeech === 'дзеяслоў') partOfSpeech = 'V';
    else if (categories.partOfSpeech === 'дзеепрыметнік') partOfSpeech = 'P';
    else if (categories.partOfSpeech === 'прыслоўе') partOfSpeech = 'R';
    else if (categories.partOfSpeech === 'злучнік') partOfSpeech = 'C';

    // Дадаем значэньні катэгорый
    if (categories.properName === 'агульны') categoryValues.properName = 'C';
    else if (categories.properName === 'уласны')
      categoryValues.properName = 'P';

    if (categories.animacy === 'адушаўлёны') categoryValues.animacy = 'A';
    else if (categories.animacy === 'неадушаўлёны')
      categoryValues.animacy = 'I';

    if (categories.personhood === 'асабовы') categoryValues.personhood = 'P';
    else if (categories.personhood === 'неасабовы')
      categoryValues.personhood = 'I';

    if (categories.abbreviation === 'скарачэньне')
      categoryValues.abbreviation = 'B';
    else if (
      categories.abbreviation === 'не скарачэньне' ||
      categories.abbreviation === ''
    )
      categoryValues.abbreviation = 'N';

    if (categories.gender === 'мужчынскі') categoryValues.gender = 'M';
    else if (categories.gender === 'жаночы') categoryValues.gender = 'F';
    else if (categories.gender === 'ніякі') categoryValues.gender = 'N';
    else if (categories.gender === 'агульны') categoryValues.gender = 'C';
    else if (categories.gender === 'субстантываваны')
      categoryValues.gender = 'S';
    else if (categories.gender === 'субстантываваны множналікавы')
      categoryValues.gender = 'U';
    else if (categories.gender === 'толькі множны лік/адсутны')
      categoryValues.gender = 'P';

    if (categories.declension === '1 скланеньне')
      categoryValues.declension = '1';
    else if (categories.declension === '2 скланеньне')
      categoryValues.declension = '2';
    else if (categories.declension === '3 скланеньне')
      categoryValues.declension = '3';
    else if (categories.declension === 'нескланяльны')
      categoryValues.declension = '0';
    else if (categories.declension === 'рознаскланяльны')
      categoryValues.declension = '4';
    else if (categories.declension === "ад'ектыўны тып скланеньня")
      categoryValues.declension = '5';
    else if (categories.declension === 'зьмешаны тып скланеньня')
      categoryValues.declension = '6';
    else if (categories.declension === 'множналікавы')
      categoryValues.declension = '7';

    if (categories.case === 'назоўны') categoryValues.case = 'N';
    else if (categories.case === 'родны') categoryValues.case = 'G';
    else if (categories.case === 'давальны') categoryValues.case = 'D';
    else if (categories.case === 'вінавальны') categoryValues.case = 'A';
    else if (categories.case === 'творны') categoryValues.case = 'I';
    else if (categories.case === 'месны') categoryValues.case = 'L';
    else if (categories.case === 'клічны') categoryValues.case = 'V';

    if (categories.number === 'адзіночны') categoryValues.number = 'S';
    else if (categories.number === 'множны') categoryValues.number = 'P';

    if (categories.adjectiveType === 'якасны')
      categoryValues.adjectiveType = 'Q';
    else if (categories.adjectiveType === 'адносны')
      categoryValues.adjectiveType = 'R';
    else if (categories.adjectiveType === 'прыналежны')
      categoryValues.adjectiveType = 'P';
    else if (categories.adjectiveType === 'нескланяльны')
      categoryValues.adjectiveType = '0';

    if (categories.degree === 'станоўчая') categoryValues.degree = 'P';
    else if (categories.degree === 'вышэйшая') categoryValues.degree = 'C';
    else if (categories.degree === 'найвышэйшая') categoryValues.degree = 'S';

    if (categories.adverbFunction === 'у функцыі прыслоўя')
      categoryValues.adverbFunction = 'R';

    if (categories.inflectionType === 'як у назоўніка')
      categoryValues.inflectionType = 'N';
    else if (categories.inflectionType === 'як у прыметніка')
      categoryValues.inflectionType = 'A';
    else if (categories.inflectionType === 'нязьменны')
      categoryValues.inflectionType = '0';

    if (categories.numeralType === 'колькасны')
      categoryValues.numeralType = 'C';
    else if (categories.numeralType === 'парадкавы')
      categoryValues.numeralType = 'O';
    else if (categories.numeralType === 'зборны')
      categoryValues.numeralType = 'K';
    else if (categories.numeralType === 'дробавы')
      categoryValues.numeralType = 'F';

    if (categories.numeralStructure === 'просты')
      categoryValues.numeralStructure = 'S';
    else if (categories.numeralStructure === 'складаны')
      categoryValues.numeralStructure = 'C';

    if (categories.numeralInflection === 'нескланяльны')
      categoryValues.numeralInflection = '0';

    if (categories.pronounType === 'асабовы') categoryValues.pronounType = 'P';
    else if (categories.pronounType === 'зваротны')
      categoryValues.pronounType = 'R';
    else if (categories.pronounType === 'прыналежны')
      categoryValues.pronounType = 'S';
    else if (categories.pronounType === 'указальны')
      categoryValues.pronounType = 'D';
    else if (categories.pronounType === 'азначальны')
      categoryValues.pronounType = 'E';
    else if (categories.pronounType === 'пытальна-адносны')
      categoryValues.pronounType = 'L';
    else if (categories.pronounType === 'адмоўны')
      categoryValues.pronounType = 'N';
    else if (categories.pronounType === 'няпэўны')
      categoryValues.pronounType = 'F';

    if (categories.person === 'першая') categoryValues.person = '1';
    else if (categories.person === 'другая') categoryValues.person = '2';
    else if (categories.person === 'трэцяя') categoryValues.person = '3';
    else if (categories.person === 'безасабовы') categoryValues.person = '0';

    if (categories.verbTransitivity === 'пераходны')
      categoryValues.verbTransitivity = 'T';
    else if (categories.verbTransitivity === 'непераходны')
      categoryValues.verbTransitivity = 'I';
    else if (categories.verbTransitivity === 'пераходны/непераходны')
      categoryValues.verbTransitivity = 'D';

    if (categories.verbAspect === 'закончанае') categoryValues.verbAspect = 'P';
    else if (categories.verbAspect === 'незакончанае')
      categoryValues.verbAspect = 'M';

    if (categories.verbReflexivity === 'зваротны')
      categoryValues.verbReflexivity = 'R';
    else if (categories.verbReflexivity === 'незваротны')
      categoryValues.verbReflexivity = 'N';

    if (categories.verbConjugation === 'першае')
      categoryValues.verbConjugation = '1';
    else if (categories.verbConjugation === 'другое')
      categoryValues.verbConjugation = '2';
    else if (categories.verbConjugation === 'рознаспрагальны')
      categoryValues.verbConjugation = '3';

    if (categories.verbTense === 'цяперашні') categoryValues.verbTense = 'R';
    else if (categories.verbTense === 'прошлы') categoryValues.verbTense = 'P';
    else if (categories.verbTense === 'будучы') categoryValues.verbTense = 'F';
    else if (categories.verbTense === 'загадны') categoryValues.verbTense = 'I';
    else if (categories.verbTense === 'інфінітыў')
      categoryValues.verbTense = '0';

    if (categories.verbMood === 'дзеепрыслоўе') categoryValues.verbMood = 'G';

    if (categories.participleType === 'незалежны')
      categoryValues.participleType = 'A';
    else if (categories.participleType === 'залежны')
      categoryValues.participleType = 'P';

    if (categories.participleForm === 'кароткая форма')
      categoryValues.participleForm = 'R';

    if (categories.adverbOrigin === 'ад назоўнікаў')
      categoryValues.adverbOrigin = 'N';
    else if (categories.adverbOrigin === 'ад прыметнікаў')
      categoryValues.adverbOrigin = 'A';
    else if (categories.adverbOrigin === 'ад лічэбнікаў')
      categoryValues.adverbOrigin = 'M';
    else if (categories.adverbOrigin === 'ад займеньнікаў')
      categoryValues.adverbOrigin = 'S';
    else if (categories.adverbOrigin === 'ад дзеепрыслоўяў')
      categoryValues.adverbOrigin = 'G';
    else if (categories.adverbOrigin === 'ад дзеясловаў')
      categoryValues.adverbOrigin = 'V';
    else if (categories.adverbOrigin === 'ад часціц')
      categoryValues.adverbOrigin = 'E';
    else if (categories.adverbOrigin === 'ад прыназоўнікаў')
      categoryValues.adverbOrigin = 'I';

    if (categories.conjunctionType === 'падпарадкавальны')
      categoryValues.conjunctionType = 'S';
    else if (categories.conjunctionType === 'злучальны')
      categoryValues.conjunctionType = 'K';

    return {
      lemma: selectedWord.item.lemma,
      partOfSpeech,
      categories: categoryValues,
    };
  };

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

  return (
    <>
      {/* Фон для overlay на мабільных */}
      <div
        className="fixed inset-0 z-40 pointer-events-none lg:hidden"
        aria-hidden="true"
      />
      <div
        className="fixed bottom-0 left-0 w-full h-2/3 bg-white border-t border-gray-200 shadow-2xl z-50 rounded-t-2xl overflow-y-auto lg:sticky lg:top-6 lg:w-80 lg:h-[calc(100vh-3rem)] lg:border-t-0 lg:border-l lg:border-r-0 lg:border-b-0 lg:rounded-none lg:shadow-none lg:overflow-y-auto"
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

            {!isEditingText && (
              <div className="flex items-center space-x-2">
                {onSaveErrorType && !showDropdown && (
                  <button
                    onClick={() => setShowErrorDropdown(true)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Пазначыць памылку"
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
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
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
            )}
          </div>

          <div className="mb-4">
            {onSaveErrorType && showDropdown && selectedWord && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тып памылкі
                </label>
                <select
                  value={selectedWord.item.metadata?.errorType || LinguisticErrorType.None}
                  onChange={(e) => {
                    const newVal = Number(e.target.value) as LinguisticErrorType;
                    onSaveErrorType(newVal);
                    if (newVal === LinguisticErrorType.None) {
                      setShowErrorDropdown(true);
                    }
                  }}
                  disabled={isSavingError}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value={LinguisticErrorType.None}>Няма памылкі</option>
                  <option value={LinguisticErrorType.Lexical}>Лексічная</option>
                  <option value={LinguisticErrorType.Orthoepic}>Артаэпічная</option>
                  <option value={LinguisticErrorType.Formational}>Словаўтваральная</option>
                  <option value={LinguisticErrorType.Stylistic}>Стылістычная</option>
                  <option value={LinguisticErrorType.Grammatical}>Граматычная</option>
                </select>
              </div>
            )}
            <div className="overflow-y-auto lg:overflow-visible">
              {showManualInput ? (
                <ManualLinguisticInput
                  onSave={handleSaveManualInput}
                  onCancel={handleCancelManualInput}
                  isSaving={isSavingManual}
                  initialValues={getExistingManualValues()}
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

          {/* Камэнтар */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Камэнтар
              </label>
              {isSavingComment && (
                <div className="text-xs text-gray-500 flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-1"></div>
                  Захоўваецца...
                </div>
              )}
            </div>
            <textarea
              value={comment}
              onChange={e => handleCommentChange(e.target.value)}
              placeholder="Дадайце камэнтар да гэтага слова..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              style={{ minHeight: '80px' }}
            />
          </div>

          {saveError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 flex-1">
                  <div className="text-red-500 text-lg">❌</div>
                  <div>
                    <div className="text-sm font-medium text-red-800 mb-1">
                      Памылка захаваньня:
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
      </div >
    </>
  );
}
