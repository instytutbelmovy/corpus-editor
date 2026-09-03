import { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { Spinner } from './icons';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md';

export const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm',
  secondary:
    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm',
  ghost: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-4 py-2 text-sm font-medium',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

export const buttonClasses = (
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className = ''
) =>
  `${BASE_CLASSES} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  // Паказвае loadingText і блякуе кнопку, пакуль ідзе захаваньне
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && loadingText ? (
        <>
          <Spinner className="h-4 w-4 border-current mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

interface ButtonLinkProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}
