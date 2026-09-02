import { ReactNode } from 'react';
import { CloseIcon, ErrorCircleIcon, SuccessCircleIcon } from './icons';

interface AlertProps {
  kind?: 'error' | 'success';
  title?: string;
  onClose?: () => void;
  children: ReactNode;
}

const KIND_CLASSES = {
  error: {
    box: 'bg-red-50 border-red-200',
    icon: 'text-red-400',
    title: 'text-red-800',
    text: 'text-red-700',
  },
  success: {
    box: 'bg-green-50 border-green-200',
    icon: 'text-green-400',
    title: 'text-green-800',
    text: 'text-green-700',
  },
};

export function Alert({
  kind = 'error',
  title,
  onClose,
  children,
}: AlertProps) {
  const classes = KIND_CLASSES[kind];
  const Icon = kind === 'error' ? ErrorCircleIcon : SuccessCircleIcon;

  return (
    <div className={`rounded-md border p-4 ${classes.box}`}>
      <div className="flex items-start">
        <Icon className={`h-5 w-5 flex-shrink-0 ${classes.icon}`} />
        <div className="ml-3 flex-1">
          {title && (
            <div className={`text-sm font-medium mb-1 ${classes.title}`}>
              {title}
            </div>
          )}
          <div
            className={`text-sm ${title ? classes.text : `font-medium ${classes.title}`}`}
          >
            {children}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`ml-2 transition-colors ${classes.icon} hover:opacity-70`}
            title="Закрыць"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
