import { LinguisticErrorType } from '../types';
import { inputClasses } from '@/app/components/Field';

const ERROR_TYPE_LABELS: Record<LinguisticErrorType, string> = {
  [LinguisticErrorType.None]: 'Няма памылкі',
  [LinguisticErrorType.Lexical]: 'Лексічная',
  [LinguisticErrorType.Orthoepic]: 'Артаэпічная',
  [LinguisticErrorType.Formational]: 'Словаўтваральная',
  [LinguisticErrorType.Stylistic]: 'Стылістычная',
  [LinguisticErrorType.Grammatical]: 'Граматычная',
};

interface ErrorTypeSelectProps {
  value: LinguisticErrorType;
  isSaving: boolean;
  onChange: (errorType: LinguisticErrorType) => void;
}

export function ErrorTypeSelect({
  value,
  isSaving,
  onChange,
}: ErrorTypeSelectProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Тып памылкі
      </label>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value) as LinguisticErrorType)}
        disabled={isSaving}
        className={inputClasses(false, 'disabled:bg-gray-100 disabled:text-gray-500')}
      >
        {Object.entries(ERROR_TYPE_LABELS).map(([errorType, label]) => (
          <option key={errorType} value={errorType}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
