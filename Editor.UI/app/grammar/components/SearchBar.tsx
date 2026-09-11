import { inputClasses } from '@/app/components/Field';
import { CloseIcon, SearchIcon, Spinner } from '@/app/components/icons';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
}

export function SearchBar({ value, onChange, loading }: SearchBarProps) {
  return (
    <div className="relative">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Пошук па леме або словаформе…"
        autoFocus
        className={inputClasses(false, 'pl-10 pr-10')}
      />
      {loading && (
        <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-gray-400" />
      )}
      {!loading && value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Ачысьціць"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
