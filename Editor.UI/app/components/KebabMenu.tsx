import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useClickOutside } from '@/app/hooks/useClickOutside';
import { KebabIcon } from './icons';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  // Або пераход па спасылцы, або дзеяньне
  href?: string;
  onClick?: () => void;
  hidden?: boolean;
}

interface KebabMenuProps {
  items: MenuItem[];
  title?: string;
  buttonClassName?: string;
}

const ITEM_CLASSES =
  'flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 whitespace-nowrap';

// Меню рэндэрыцца праз партал у body, каб не абрэзвалася межамі табліцы
export function KebabMenu({
  items,
  title = 'Дзеяньні',
  buttonClassName = 'text-gray-400 hover:text-gray-600',
}: KebabMenuProps) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const isOpen = position !== null;
  const visibleItems = items.filter(item => !item.hidden);
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Слухаем mousedown (useClickOutside), а не click: toggle спыняе click на кораню React'а, таму па кліку клікам іншыя адкрытыя меню не даведаліся б, што трэба зачыніцца
  useClickOutside([buttonRef, menuRef], () => setPosition(null), isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const close = () => setPosition(null);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [isOpen]);

  const toggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isOpen) {
      setPosition(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({
      top: rect.bottom + window.scrollY + 8,
      left: rect.right + window.scrollX,
    });
  };

  return (
    <div className="relative" ref={buttonRef}>
      <button
        onClick={toggle}
        className={`transition-colors duration-150 p-1 rounded-full hover:bg-gray-100 ${buttonClassName}`}
        title={title}
      >
        <KebabIcon />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="absolute w-max min-w-48 max-w-xs bg-white rounded-md shadow-lg z-50 border border-gray-200"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: 'translateX(-100%)',
            }}
          >
            <div className="py-1">
              {visibleItems.map(item =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setPosition(null)}
                    className={ITEM_CLASSES}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    onClick={() => {
                      setPosition(null);
                      item.onClick?.();
                    }}
                    className={ITEM_CLASSES}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                )
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
