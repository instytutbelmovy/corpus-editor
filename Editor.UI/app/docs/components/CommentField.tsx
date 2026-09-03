import { Spinner } from '@/app/components/icons';

interface CommentFieldProps {
  value: string;
  isSaving: boolean;
  onChange: (value: string) => void;
}

export function CommentField({ value, isSaving, onChange }: CommentFieldProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">Камэнтар</label>
        {isSaving && (
          <div className="text-xs text-gray-500 flex items-center">
            <Spinner className="h-3 w-3 border-blue-500 mr-1" />
            Захоўваецца...
          </div>
        )}
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Дадайце камэнтар да гэтага слова..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows={3}
        style={{ minHeight: '80px' }}
      />
    </div>
  );
}
