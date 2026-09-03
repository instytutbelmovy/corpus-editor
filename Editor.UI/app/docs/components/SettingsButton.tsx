import { useState, useRef } from 'react';
import { DisplayMode } from '../uiStore';
import { useClickOutside } from '@/app/hooks/useClickOutside';
import { GearIcon } from '@/app/components/icons';

interface SettingsButtonProps {
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
}

export function SettingsButton({
  displayMode,
  onDisplayModeChange,
}: SettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside([buttonRef, menuRef], () => setIsOpen(false), isOpen);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleModeChange = (mode: DisplayMode) => {
    onDisplayModeChange(mode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
        title="Налады адлюстраваньня"
      >
        <GearIcon />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
        >
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 mb-2 px-2">
              Рэжым адлюстраваньня
            </div>

            <button
              onClick={() => handleModeChange('full')}
              className={`w-full text-left px-2 py-1.5 text-sm rounded ${
                displayMode === 'full'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">Поўны</div>
              <div className="text-xs text-gray-500">
                Паказвае ўсе катэгорыі
              </div>
            </button>

            <button
              onClick={() => handleModeChange('compact')}
              className={`w-full text-left px-2 py-1.5 text-sm rounded ${
                displayMode === 'compact'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">Скарочаны</div>
              <div className="text-xs text-gray-500">
                Толькі важныя катэгорыі
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
