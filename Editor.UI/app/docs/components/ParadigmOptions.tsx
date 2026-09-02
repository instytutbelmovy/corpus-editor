import {
  GrammarInfo,
  ParadigmFormId,
  LinguisticTag,
  LinguisticItem,
} from '../types';
import {
  parseLinguisticTag,
  CATEGORY_LABELS,
  CategoryKey,
  LinguisticCategories,
} from '../linguisticCategories';
import { paradigmFormIdEquals } from '../wordEditing';
import { DisplayMode } from '../uiStore';
import { CheckIcon, PencilIcon } from '@/app/components/icons';

interface ParadigmOptionsProps {
  options: GrammarInfo[];
  selectedParadigmFormId: ParadigmFormId | null;
  selectedItem?: LinguisticItem | null;
  displayMode: DisplayMode;
  onSelect: (paradigmFormId: ParadigmFormId) => void;
  onManualInput?: () => void;
  onBeforeSelect?: () => Promise<void>;
  onSaveManualCategories?: (
    lemma: string,
    linguisticTag: LinguisticTag
  ) => Promise<void>;
}

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as CategoryKey[];

// Кастомнае (уведзенае ўручную) слова не мае paradigmFormId — параўноўваем лему і тэг
const isCustomOptionSelected = (
  item: LinguisticItem | null | undefined,
  option: GrammarInfo
) =>
  !!item &&
  item.paradigmFormId === null &&
  item.lemma === option.lemma &&
  item.linguisticTag !== null &&
  item.linguisticTag.paradigmTag === option.linguisticTag.paradigmTag &&
  item.linguisticTag.formTag === option.linguisticTag.formTag;

const optionKey = (option: GrammarInfo) =>
  option.paradigmFormId === null
    ? `custom-${option.lemma}-${option.linguisticTag.paradigmTag}-${option.linguisticTag.formTag || ''}`
    : `${option.paradigmFormId.paradigmId}-${option.paradigmFormId.variantId}-${option.paradigmFormId.formTag}`;

// Варыянты групуюцца па частках мовы
function groupByPartOfSpeech(options: GrammarInfo[]) {
  const groups = new Map<string, GrammarInfo[]>();

  for (const option of options) {
    const partOfSpeech =
      parseLinguisticTag(option.linguisticTag).partOfSpeech || 'Невызначана';
    const group = groups.get(partOfSpeech);
    if (group) {
      group.push(option);
    } else {
      groups.set(partOfSpeech, [option]);
    }
  }

  return [...groups.entries()].map(([partOfSpeech, groupOptions]) => ({
    partOfSpeech,
    options: groupOptions,
  }));
}

// Катэгорыі, аднолькавыя для ўсёй групы: у скарочаным рэжыме іх не паказваем
function getCommonCategories(
  options: GrammarInfo[]
): Partial<LinguisticCategories> {
  if (options.length <= 1) return {};

  const allCategories = options.map(option =>
    parseLinguisticTag(option.linguisticTag)
  );
  const common: Partial<LinguisticCategories> = {};

  for (const key of CATEGORY_KEYS) {
    const values = allCategories
      .map(categories => categories[key])
      .filter(value => value !== null);
    if (values.length > 0 && values.every(value => value === values[0])) {
      common[key] = values[0];
    }
  }

  return common;
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

  const handleSelect = async (option: GrammarInfo) => {
    await onBeforeSelect?.();
    if (option.paradigmFormId === null) {
      await onSaveManualCategories?.(option.lemma, option.linguisticTag);
    } else {
      onSelect(option.paradigmFormId);
    }
  };

  return (
    <div className="space-y-4">
      {groupByPartOfSpeech(options).map(group => {
        const commonCategories = getCommonCategories(group.options);

        return (
          <div key={group.partOfSpeech}>
            <div className="flex items-center mb-2">
              <h4 className="font-medium text-gray-700 text-sm">
                {group.partOfSpeech}
              </h4>
              <div className="flex-1 h-px bg-gray-200 ml-3" />
            </div>
            <div className="space-y-2">
              {group.options.map(option => {
                const isSelected =
                  option.paradigmFormId === null
                    ? isCustomOptionSelected(selectedItem, option)
                    : paradigmFormIdEquals(
                        selectedParadigmFormId,
                        option.paradigmFormId
                      );
                const categories = parseLinguisticTag(option.linguisticTag);

                return (
                  <div
                    key={optionKey(option)}
                    className={`border rounded-lg p-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => handleSelect(option)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-row items-baseline md:flex-col md:items-start">
                          <div className="font-medium text-gray-900 mb-0 md:mb-2">
                            {option.lemma}
                          </div>

                          <div className="flex flex-wrap gap-1 ml-2 md:ml-0">
                            {CATEGORY_KEYS.map(key => (
                              <Category
                                key={key}
                                categoryKey={key}
                                value={categories[key]}
                                isCommon={
                                  commonCategories[key] === categories[key]
                                }
                                displayMode={displayMode}
                              />
                            ))}
                          </div>
                        </div>

                        {option.meaning && (
                          <div className="text-sm text-gray-500 italic mt-2">
                            {option.meaning}
                          </div>
                        )}
                      </div>

                      {isSelected ? (
                        <CheckIcon className="w-5 h-5 ml-2 text-green-500" />
                      ) : option.paradigmFormId === null ? (
                        <PencilIcon className="w-5 h-5 ml-2 text-gray-400" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {onManualInput && (
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={onManualInput}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
          >
            <PencilIcon />
            <span>Ручны ўвод катэгорый</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Частка мовы паказваецца загалоўкам групы, таму ў радку яе няма
function Category({
  categoryKey,
  value,
  isCommon,
  displayMode,
}: {
  categoryKey: CategoryKey;
  value: string | null;
  isCommon: boolean;
  displayMode: DisplayMode;
}) {
  if (
    !value ||
    categoryKey === 'partOfSpeech' ||
    (displayMode === 'compact' && isCommon)
  ) {
    return null;
  }

  return (
    <span
      className={`text-xs mr-2 ${isCommon ? 'text-gray-500' : 'text-gray-900'} ${
        !isCommon && displayMode === 'full' ? 'font-semibold' : 'font-normal'
      }`}
      title={CATEGORY_LABELS[categoryKey]}
    >
      {value}
    </span>
  );
}
