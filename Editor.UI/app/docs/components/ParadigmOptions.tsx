import {
  GrammarInfo,
  ParadigmFormId,
  LinguisticTag,
  LinguisticItem,
} from '../types';
import {
  parseLinguisticTag,
  LinguisticCategories,
} from '../linguisticCategories';

interface ParadigmOptionsProps {
  options: GrammarInfo[];
  selectedParadigmFormId: ParadigmFormId | null;
  selectedItem?: LinguisticItem | null;
  displayMode: 'full' | 'compact';
  onSelect: (paradigmFormId: ParadigmFormId) => void;
  onManualInput?: () => void;
  onBeforeSelect?: () => Promise<void>;
  onSaveManualCategories?: (
    lemma: string,
    linguisticTag: LinguisticTag
  ) => Promise<void>;
}

interface GroupedOptions {
  partOfSpeech: string;
  options: GrammarInfo[];
}

// Функцыя для групоўкі опцый па частках мовы
function groupOptionsByPartOfSpeech(options: GrammarInfo[]): GroupedOptions[] {
  const groups: Record<string, GrammarInfo[]> = {};

  options.forEach(option => {
    const categories = parseLinguisticTag(option.linguisticTag);
    const partOfSpeech = categories.partOfSpeech || 'Невызначана';

    if (!groups[partOfSpeech]) {
      groups[partOfSpeech] = [];
    }
    groups[partOfSpeech].push(option);
  });

  return Object.entries(groups).map(([partOfSpeech, options]) => ({
    partOfSpeech,
    options,
  }));
}

// Функцыя для вызначэньня агульных катэгорый у групе
function getCommonCategories(
  options: GrammarInfo[]
): Partial<LinguisticCategories> {
  if (options.length <= 1) {
    return {};
  }

  const allCategories = options.map(option =>
    parseLinguisticTag(option.linguisticTag)
  );
  const commonCategories: Partial<LinguisticCategories> = {};

  // Правяраем кожную катэгорыю
  const categoryKeys = Object.keys(
    allCategories[0]
  ) as (keyof LinguisticCategories)[];

  categoryKeys.forEach(key => {
    const values = allCategories
      .map(cat => cat[key])
      .filter(val => val !== null);
    if (values.length > 0 && values.every(val => val === values[0])) {
      commonCategories[key] = values[0];
    }
  });

  return commonCategories;
}

// Функцыя для адлюстраваньня катэгорыі
function renderCategory(
  key: string,
  value: string | null,
  isCommon: boolean,
  displayMode: 'full' | 'compact'
) {
  if (!value || (displayMode === 'compact' && isCommon)) {
    return null;
  }

  const categoryLabels: Record<string, string> = {
    partOfSpeech: 'Частка мовы',
    properName: 'Уласнае/агульнае',
    animacy: 'Адушаўлёнасць',
    personhood: 'Асабовасць',
    abbreviation: 'Скарачэньне',
    gender: 'Род',
    declension: 'Скланеньне',
    case: 'Склон',
    number: 'Лік',
    adjectiveType: 'Тып прыметніка',
    degree: 'Ступень',
    adverbFunction: 'Функцыя прыслоўя',
    inflectionType: 'Тып змены',
    numeralType: 'Тып лічэбніка',
    numeralStructure: 'Структура лічэбніка',
    numeralInflection: 'Зменлівасць лічэбніка',
    pronounType: 'Тып займеньніка',
    person: 'Асоба',
    verbTransitivity: 'Пераходнасць дзеяслова',
    verbAspect: 'Від дзеяслова',
    verbReflexivity: 'Зваротнасць дзеяслова',
    verbConjugation: 'Спражэньне дзеяслова',
    verbTense: 'Час дзеяслова',
    verbMood: 'Лад дзеяслова',
    participleType: 'Тып дзеепрыметніка',
    participleForm: 'Форма дзеепрыметніка',
    adverbOrigin: 'Паходжаньне прыслоўя',
    conjunctionType: 'Тып злучніка',
  };

  const label = categoryLabels[key] || key;
  const textColor = isCommon ? 'text-gray-500' : 'text-gray-900';
  const fontWeight =
    !isCommon && displayMode === 'full' ? 'font-semibold' : 'font-normal';

  return (
    <span
      key={key}
      className={`text-xs ${textColor} ${fontWeight} mr-2`}
      title={label}
    >
      {value}
    </span>
  );
}

export function ParadigmOptions({
  options,
  selectedParadigmFormId,
  selectedItem,
  displayMode,
  onSelect,
  onManualInput,
  onBeforeSelect,
  onSaveManualCategories,
}: ParadigmOptionsProps) {
  const groupedOptions = groupOptionsByPartOfSpeech(options);

  if (options.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="text-2xl mb-2">📝</div>
        <p>Няма даступных варыянтаў парадыгмы для гэтага слова</p>
        {onManualInput && (
          <button
            onClick={onManualInput}
            className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            Ручны ўвод катэгорый
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedOptions.map(group => {
        const commonCategories = getCommonCategories(group.options);

        return (
          <div key={group.partOfSpeech}>
            <div className="flex items-center mb-2">
              <h4 className="font-medium text-gray-700 text-sm">
                {group.partOfSpeech}
              </h4>
              <div className="flex-1 h-px bg-gray-200 ml-3"></div>
            </div>
            <div className="space-y-2">
              {group.options.map(option => {
                // Правяраем, ці выбрана опцыя
                const isSelected =
                  option.paradigmFormId === null
                    ? // Для кастомных словаў правяраем lemma і linguisticTag
                      selectedItem !== null &&
                      selectedItem !== undefined &&
                      selectedItem.paradigmFormId === null &&
                      selectedItem.lemma === option.lemma &&
                      selectedItem.linguisticTag !== null &&
                      selectedItem.linguisticTag.paradigmTag ===
                        option.linguisticTag.paradigmTag &&
                      selectedItem.linguisticTag.formTag ===
                        option.linguisticTag.formTag
                    : // Для звычайных парадыгм правяраем paradigmFormId
                      selectedParadigmFormId !== null &&
                      selectedParadigmFormId.paradigmId ===
                        option.paradigmFormId.paradigmId &&
                      selectedParadigmFormId.variantId ===
                        option.paradigmFormId.variantId &&
                      selectedParadigmFormId.formTag ===
                        option.paradigmFormId.formTag;

                const categories = parseLinguisticTag(option.linguisticTag);

                // Генеруем унікальны ключ для опцыі
                const optionKey =
                  option.paradigmFormId === null
                    ? `custom-${option.lemma}-${option.linguisticTag.paradigmTag}-${option.linguisticTag.formTag || ''}`
                    : `${option.paradigmFormId.paradigmId}-${option.paradigmFormId.variantId}-${option.paradigmFormId.formTag}`;

                return (
                  <div
                    key={optionKey}
                    className={`border rounded-lg p-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={async () => {
                      if (onBeforeSelect) {
                        await onBeforeSelect();
                      }
                      // Калі paradigmFormId null, гэта кастомнае слова - выклікаем захаваньне ручных катэгорый
                      if (option.paradigmFormId === null) {
                        if (onSaveManualCategories) {
                          await onSaveManualCategories(
                            option.lemma,
                            option.linguisticTag
                          );
                        }
                      } else {
                        onSelect(option.paradigmFormId);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-row items-baseline md:flex-col md:items-start">
                          <div className="font-medium text-gray-900 mb-0 md:mb-2">
                            {option.lemma}
                          </div>

                          <div className="flex flex-wrap gap-1 ml-2 md:ml-0">
                            {Object.entries(categories).map(([key, value]) => {
                              if (!value || key === 'partOfSpeech') return null;
                              const isCommon =
                                key in commonCategories &&
                                commonCategories[
                                  key as keyof LinguisticCategories
                                ] === value;
                              return renderCategory(
                                key,
                                value,
                                isCommon,
                                displayMode
                              );
                            })}
                          </div>
                        </div>

                        {option.meaning && (
                          <div className="text-sm text-gray-500 italic mt-2">
                            {option.meaning}
                          </div>
                        )}
                      </div>

                      {isSelected ? (
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
                      ) : option.paradigmFormId === null ? (
                        <div className="ml-2 text-gray-400">
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Кнопка ручнага ўводу */}
      {onManualInput && (
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={onManualInput}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span>Ручны ўвод катэгорый</span>
          </button>
        </div>
      )}
    </div>
  );
}
