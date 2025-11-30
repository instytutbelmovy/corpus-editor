import { useState } from 'react';

interface InteractiveSpaceProps {
  canGlue: boolean;
  isLastItem?: boolean;
}

export function InteractiveSpace({ canGlue, isLastItem }: InteractiveSpaceProps) {
  const [isDeleteHovered, setIsDeleteHovered] = useState(false);

  return (
    <span className={`relative group/space inline-block w-1 text-center cursor-pointer hover:bg-blue-200 px-0.5 rounded ${isDeleteHovered ? '!bg-red-100' : ''}`}>
      &nbsp;
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 translate-y-1 pb-2 hidden group-hover/space:flex flex-col z-10 min-w-[150px]">
        <div className="flex flex-col gap-1 bg-white shadow-lg rounded p-1 border border-gray-200 whitespace-nowrap">
          <button className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left">Дадаць слова</button>
          <button className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left">Дадаць пунктуацыю</button>
          {!isLastItem && (
            <>
              <button className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left">Разьбіць на сказы</button>
              <button className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left">Дадаць перанос</button>
            </>
          )}
        </div>
      </div>
      {/* Glue option at the bottom */}
      {canGlue && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1 pt-2 hidden group-hover/space:flex flex-col z-10 min-w-[150px]">
          <div className="flex flex-col gap-1 bg-white shadow-lg rounded p-1 border border-gray-200 whitespace-nowrap">
            <button
              className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-left text-red-600"
              onMouseEnter={() => setIsDeleteHovered(true)}
              onMouseLeave={() => setIsDeleteHovered(false)}
            >
              Выдаліць
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
