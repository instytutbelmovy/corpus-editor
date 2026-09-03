import { useRef, useState } from 'react';
import { Field, inputClasses } from './Field';
import { useClickOutside } from '@/app/hooks/useClickOutside';

interface ComboboxInputProps {
  id: string;
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
}

// Тэкставае поле з падказкамі: можна выбраць са сьпісу або ўвесьці сваё
export function ComboboxInput({
  id,
  label,
  value,
  options,
  placeholder,
  error,
  onChange,
}: ComboboxInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  return (
    <div ref={containerRef} className="relative">
      <Field htmlFor={id} label={label} error={error}>
        <input
          type="text"
          id={id}
          value={value}
          onChange={event => onChange(event.target.value)}
          onFocus={() => setIsOpen(true)}
          className={inputClasses(!!error)}
          placeholder={placeholder}
          autoComplete="off"
        />
      </Field>
      {isOpen && options.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {options.map(option => (
            <li
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm text-gray-700"
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
