import { ReactNode } from 'react';

export function Table({ children }: { children: ReactNode }) {
  return <table className="min-w-full divide-y divide-gray-200">{children}</table>;
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-gray-50">
      <tr>{children}</tr>
    </thead>
  );
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>;
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      {children}
    </th>
  );
}

export function Td({
  className = '',
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return <td className={`px-6 py-4 text-sm ${className}`}>{children}</td>;
}

export function Tr({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <tr className={`hover:bg-gray-50 transition-colors duration-150 ${className}`}>
      {children}
    </tr>
  );
}
