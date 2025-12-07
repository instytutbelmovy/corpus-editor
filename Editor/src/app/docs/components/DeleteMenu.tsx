interface DeleteMenuProps {
  onDelete: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  label: string;
  groupHoverClass: string;
}

export function DeleteMenu({ onDelete, onMouseEnter, onMouseLeave, label, groupHoverClass }: DeleteMenuProps) {
  return (
    <div className={`absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1 pt-2 hidden ${groupHoverClass} flex-col z-20`}>
      <div className="flex flex-col gap-1 bg-white shadow-lg rounded p-1 border border-gray-200 whitespace-nowrap">
        <button
          className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left text-red-600"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {label}
        </button>
      </div>
    </div>
  );
}
