import {
  CATEGORY_LABELS,
  categoryOptions,
  CategoryKey,
} from '@/app/docs/linguisticCategories';

// Вузкі выбар адной граматычнай катэгорыі: бачная толькі лацінская літара коду
// (сапраўдны <select> празрысты і накладзены зьверху), поўны тэкст - у выплыўной
// падказцы (title) і ў раскрытым сьпісе.
export function CompactCategorySelect({
  pos,
  categoryKey,
  value,
  onChange,
  className = '',
}: {
  pos: string;
  categoryKey: CategoryKey;
  value: string;
  onChange: (code: string) => void;
  className?: string;
}) {
  const options = categoryOptions(pos, categoryKey);
  const selected = options.find(o => o.value === value);
  const title = `${CATEGORY_LABELS[categoryKey]}: ${
    selected ? `${selected.value} — ${selected.label}` : '—'
  }`;
  return (
    <div
      className={`relative h-9 w-9 shrink-0 rounded-md has-[select:focus]:ring-2 has-[select:focus]:ring-blue-500 ${className}`}
    >
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        title={title}
        aria-label={CATEGORY_LABELS[categoryKey]}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        <option value="">—</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.value} — {o.label}
          </option>
        ))}
      </select>
      <div
        title={title}
        className="pointer-events-none flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-sm shadow-sm"
      >
        {value || '—'}
      </div>
    </div>
  );
}
