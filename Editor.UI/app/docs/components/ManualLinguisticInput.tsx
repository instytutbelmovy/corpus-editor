import { useState, useEffect } from 'react';
import { LinguisticTag } from '../types';
import {
  buildTag,
  CATEGORY_LABELS,
  CategoryKey,
  categoryOptions,
  manualCategoryKeys,
  PART_OF_SPEECH_LABELS,
} from '../linguisticCategories';
import { Button } from '@/app/components';
import { inputClasses } from '@/app/components/Field';

export interface ManualInputValues {
  lemma: string;
  partOfSpeech: string;
  categories: Partial<Record<CategoryKey, string>>;
}

interface ManualLinguisticInputProps {
  onSave: (lemma: string, linguisticTag: LinguisticTag) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialValues?: ManualInputValues | null;
}

// Ручная зборка тэгу: катэгорыі і дапушчальныя коды бяруцца са схемы тэгаў
export function ManualLinguisticInput({
  onSave,
  onCancel,
  isSaving = false,
  initialValues = null,
}: ManualLinguisticInputProps) {
  const [lemma, setLemma] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [categories, setCategories] = useState<
    Partial<Record<CategoryKey, string>>
  >({});

  useEffect(() => {
    setLemma(initialValues?.lemma ?? '');
    setPartOfSpeech(initialValues?.partOfSpeech ?? '');
    setCategories(initialValues?.categories ?? {});
  }, [initialValues]);

  const tag = buildTag(partOfSpeech, categories);
  const canSave = Boolean(lemma.trim() && partOfSpeech);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Ручны ўвод</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Лема *
          </label>
          <input
            type="text"
            value={lemma}
            // «+» ставіць знак націску на папярэднюю літару
            onChange={e => setLemma(e.target.value.replace(/\+/g, '́'))}
            className={inputClasses()}
            placeholder="Увядзіце лему"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Часціна мовы *
          </label>
          <select
            value={partOfSpeech}
            onChange={e => {
              setPartOfSpeech(e.target.value);
              setCategories({});
            }}
            className={inputClasses()}
          >
            <option value="">Выберыце частку мовы</option>
            {Object.entries(PART_OF_SPEECH_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {value} {label}
              </option>
            ))}
          </select>
        </div>

        {partOfSpeech && (
          <div className="space-y-3">
            {manualCategoryKeys(partOfSpeech).map(key => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {CATEGORY_LABELS[key]}
                </label>
                <select
                  value={categories[key] || ''}
                  onChange={e =>
                    setCategories(prev => ({ ...prev, [key]: e.target.value }))
                  }
                  className={inputClasses()}
                >
                  <option value="">Не выбрана</option>
                  {categoryOptions(partOfSpeech, key).map(option => (
                    <option key={option.value} value={option.value}>
                      {option.value} {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Папярэдні прагляд тэгу */}
        {partOfSpeech && (
          <div className="space-y-2 text-sm mt-6">
            <code className="bg-white px-2 py-1 rounded border">
              {tag.paradigmTag}|{tag.formTag ?? 'null'}
            </code>
          </div>
        )}
      </div>

      <div className="flex space-x-3 pt-4">
        <Button
          onClick={() => onSave(lemma.trim(), tag)}
          disabled={!canSave}
          loading={isSaving}
          loadingText="Захаваньне..."
          className="flex-1"
        >
          Захаваць
        </Button>
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1"
        >
          Назад
        </Button>
      </div>
    </div>
  );
}
