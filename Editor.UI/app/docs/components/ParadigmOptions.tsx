import { useMemo } from 'react';
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
  onSelect: (paradigmFormId: ParadigmFormId) => Promise<void>;
  onManualInput?: () => void;
  onBeforeSelect?: () => Promise<void>;
  onSaveManualCategories?: (
    lemma: string,
    linguisticTag: LinguisticTag
  ) => Promise<void>;
}

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as CategoryKey[];

// Кастомнае (уведзенае ўручную) слова не мае paradigmFormId - параўноўваем лему і тэг
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

// Тэг разьбіраецца адзін раз на варыянт і далей перадаецца разам зь ім
interface ParsedOption {
  option: GrammarInfo;
  categories: LinguisticCategories;
}

// Варыянты групуюцца па частках мовы
function groupByPartOfSpeech(options: GrammarInfo[]) {
  const groups = new Map<string, ParsedOption[]>();

  for (const option of options) {
    const categories = parseLinguisticTag(option.linguisticTag);
    const partOfSpeech = categories.partOfSpeech || 'Невызначана';
    const group = groups.get(partOfSpeech);
    if (group) {
      group.push({ option, categories });
    } else {
      groups.set(partOfSpeech, [{ option, categories }]);
    }
  }

  return [...groups.entries()].map(([partOfSpeech, groupOptions]) => ({
    partOfSpeech,
    options: groupOptions,
    commonCategories: getCommonCategories(groupOptions),
  }));
}

// Катэгорыі, аднолькавыя для ўсёй групы: у скарочаным рэжыме іх не паказваем
function getCommonCategories(
  parsedOptions: ParsedOption[]
): Partial<LinguisticCategories> {
  if (parsedOptions.length <= 1) return {};

  const common: Partial<LinguisticCategories> = {};

  for (const key of CATEGORY_KEYS) {
    const values = parsedOptions
      .map(({ categories }) => categories[key])
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
  const groups = useMemo(() => groupByPartOfSpeech(options), [options]);

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

  // Выклікаецца з onClick, таму памылку ловім тут: банэр пакажа wordEditing
  const handleSelect = async (option: GrammarInfo) => {
    try {
      await onBeforeSelect?.();
      if (option.paradigmFormId === null) {
        await onSaveManualCategories?.(option.lemma, option.linguisticTag);
      } else {
        await onSelect(option.paradigmFormId);
      }
    } catch (error) {
      console.error('Памылка захаваньня варыянту:', error);
    }
  };

  return (
    <div className="space-y-4">
      {groups.map(group => {
        const { commonCategories } = group;

        return (
          <div key={group.partOfSpeech}>
            <div className="flex items-center mb-2">
              <h4 className="font-medium text-gray-700 text-sm">
                {group.partOfSpeech}
              </h4>
              <div className="flex-1 h-px bg-gray-200 ml-3" />
            </div>
            <div className="space-y-2">
              {group.options.map(({ option, categories }) => {
                const isSelected =
                  option.paradigmFormId === null
                    ? isCustomOptionSelected(selectedItem, option)
                    : paradigmFormIdEquals(
                        selectedParadigmFormId,
                        option.paradigmFormId
                      );

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

// Часьціна мовы паказваецца загалоўкам групы, таму ў радку яе няма
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
