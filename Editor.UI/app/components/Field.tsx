import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

// Агульны выгляд палёў формаў
export const inputClasses = (hasError?: boolean, className = '') =>
  `w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
    hasError ? 'border-red-300' : 'border-gray-300'
  } ${className}`;

interface FieldProps {
  htmlFor?: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function Field({
  htmlFor,
  label,
  required,
  error,
  className = '',
  children,
}: FieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label}
        {required && ' *'}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  fieldClassName?: string;
}

export function TextInput({
  label,
  error,
  required,
  id,
  fieldClassName,
  className = '',
  ...props
}: TextInputProps) {
  return (
    <Field
      htmlFor={id}
      label={label}
      required={required}
      error={error}
      className={fieldClassName}
    >
      <input
        id={id}
        required={required}
        className={inputClasses(!!error, className)}
        {...props}
      />
    </Field>
  );
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: ReactNode;
}

export function SelectInput({
  label,
  error,
  required,
  id,
  className = '',
  children,
  ...props
}: SelectInputProps) {
  return (
    <Field htmlFor={id} label={label} required={required} error={error}>
      <select
        id={id}
        required={required}
        className={inputClasses(!!error, className)}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
}
