// Агульныя іконкі. Кожная - той самы SVG, што раней капіяваўся па кампанэнтах.

interface IconProps {
  className?: string;
}

// Контурныя іконкі (24x24, stroke)
const strokeIcon = (path: string, defaultClass = 'w-5 h-5') =>
  function StrokeIcon({ className = defaultClass }: IconProps) {
    return (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={path}
        />
      </svg>
    );
  };

// Суцэльныя іконкі (20x20, fill)
const solidIcon = (path: string, defaultClass = 'w-5 h-5') =>
  function SolidIcon({ className = defaultClass }: IconProps) {
    return (
      <svg
        className={className}
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path fillRule="evenodd" d={path} clipRule="evenodd" />
      </svg>
    );
  };

export const PencilIcon = strokeIcon(
  'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
);

export const CloseIcon = strokeIcon('M6 18L18 6M6 6l12 12');

export const PlusIcon = strokeIcon('M12 4v16m8-8H4', 'w-4 h-4');

export const RefreshIcon = strokeIcon(
  'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  'w-4 h-4'
);

export const SparklesIcon = strokeIcon(
  'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L20 12l-6.714 2.143L11 21l-2.286-6.857L2 12l6.714-2.143L11 3z'
);

export const DownloadIcon = strokeIcon(
  'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  'w-4 h-4'
);

export const SearchIcon = strokeIcon(
  'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  'w-5 h-5'
);

// Шэўран глядзіць управа; разгорнуты стан паварочваецца праз rotate-90
export const ChevronRightIcon = strokeIcon('M9 5l7 7-7 7', 'w-4 h-4');

export const WarningIcon = strokeIcon(
  'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
);

export const LogoutIcon = strokeIcon(
  'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  'w-4 h-4 mr-1.5'
);

export const KebabIcon = solidIcon(
  'M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z'
);

export const ErrorCircleIcon = solidIcon(
  'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
);

export const SuccessCircleIcon = solidIcon(
  'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
);

export const CheckIcon = solidIcon(
  'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
);

export const FileIcon = solidIcon(
  'M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z',
  'w-4 h-4 mr-2'
);

export const GearIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const historyIcon = (paths: [string, string]) =>
  function HistoryIcon({ className = '' }: IconProps) {
    return (
      <svg
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={paths[0]} />
        <path d={paths[1]} />
      </svg>
    );
  };

export const UndoIcon = historyIcon([
  'M3 7v6h6',
  'M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13',
]);

export const RedoIcon = historyIcon([
  'M21 7v6h-6',
  'M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13',
]);

export const UploadIcon = ({
  className = 'mx-auto h-12 w-12 text-gray-400',
}: IconProps) => (
  <svg
    className={className}
    stroke="currentColor"
    fill="none"
    viewBox="0 0 48 48"
    aria-hidden="true"
  >
    <path
      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const GoogleIcon = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.29 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.39-2.29v-3.1H1.28A11.97 11.97 0 0 0 0 12c0 1.93.46 3.76 1.28 5.39l4.01-3.1z"
    />
    <path
      fill="#EA4335"
      d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.61l4.01 3.1c.94-2.83 3.59-4.94 6.71-4.94z"
    />
  </svg>
);

// Кручок загрузкі; памер і колер задаюцца класамі
export const Spinner = ({
  className = 'h-6 w-6 border-blue-600',
}: IconProps) => (
  <div
    className={`animate-spin rounded-full border-b-2 ${className}`}
    role="status"
    aria-label="Загрузка"
  />
);
