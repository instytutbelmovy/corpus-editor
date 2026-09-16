import { inputClasses } from '@/app/components/Field';
import {
  buildTag,
  CATEGORY_LABELS,
  categoryOptions,
  formCategoryKeys,
  paradigmCategoryKeys,
  parseTagCodes,
} from '@/app/docs/linguisticCategories';

export function CategoryFields({
  paradigmTag,
  formTag,
  onChange,
}: {
  paradigmTag: string;
  formTag?: string;
  onChange: (tag: string) => void;
}) {
  const pos = paradigmTag[0];
  const isForm = formTag !== undefined;
  const codes = parseTagCodes(
    { paradigmTag, formTag: formTag ?? null },
    isForm ? 'form' : 'all'
  );
  const keys = isForm
    ? formCategoryKeys(pos, codes)
    : paradigmCategoryKeys(pos);
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {keys.map(key => (
        <select
          key={key}
          aria-label={CATEGORY_LABELS[key]}
          value={codes[key] ?? ''}
          onChange={e => {
            const tag = buildTag(pos, { ...codes, [key]: e.target.value });
            onChange(isForm ? (tag.formTag ?? '') : tag.paradigmTag);
          }}
          className={inputClasses()}
        >
          <option value="">{CATEGORY_LABELS[key]}</option>
          {codes[key] &&
            !categoryOptions(pos, key).some(o => o.value === codes[key]) && (
              <option value={codes[key]}>{codes[key]}</option>
            )}
          {categoryOptions(pos, key).map(o => (
            <option key={o.value} value={o.value}>
              {o.value} — {o.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
