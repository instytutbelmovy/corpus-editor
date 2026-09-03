import { ReactNode, useState } from 'react';

export interface HoverMenuItem {
  label: string;
  onClick: () => void;
  // Чырвоны пункт — выдаленьне ці аб'яднаньне
  danger?: boolean;
  // Падсьвечвае маркер чырвоным, пакуль курсор на пункце
  highlightMarkerOnHover?: boolean;
}

interface HoverMenuProps {
  // Унікальнае імя групы для Tailwind group-hover
  group: 'item' | 'linebreak' | 'boundary' | 'start' | 'glued';
  marker: ReactNode;
  markerClassName?: string;
  above?: HoverMenuItem[];
  below?: HoverMenuItem[];
  // Паказваць меню па стане, а не па :hover (для InteractiveSpace)
  isOpen?: boolean;
  children?: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  zIndex?: 10 | 20;
}

// Класы group-hover пішуцца цалкам, каб Tailwind іх убачыў пры зборцы
const GROUP_CLASSES = {
  item: { group: 'group/item', show: 'group-hover/item:flex' },
  linebreak: { group: 'group/linebreak', show: 'group-hover/linebreak:flex' },
  boundary: { group: 'group/boundary', show: 'group-hover/boundary:flex' },
  start: { group: 'group/start', show: 'group-hover/start:flex' },
  glued: { group: 'group/glued', show: 'group-hover/glued:flex' },
};

const PANEL_BASE =
  'absolute left-1/2 transform -translate-x-1/2 flex-col min-w-[150px]';
const PANEL_ABOVE = 'bottom-full translate-y-1 pb-2';
const PANEL_BELOW = 'top-full -translate-y-1 pt-2';
const CARD_CLASSES =
  'flex flex-col gap-1 bg-white shadow-lg rounded p-1 border border-gray-200 whitespace-nowrap';
const ITEM_CLASSES = 'px-2 py-1 text-xs hover:bg-gray-100 rounded text-left';

// Маркер (прабел, |, ¶, ↵ ці само слова) з выпадальнымі дзеяньнямі зьверху і зьнізу
export function HoverMenu({
  group,
  marker,
  markerClassName = '',
  above,
  below,
  isOpen,
  children,
  onMouseEnter,
  onMouseLeave,
  zIndex = 10,
}: HoverMenuProps) {
  const [markerHighlighted, setMarkerHighlighted] = useState(false);
  const groupClasses = GROUP_CLASSES[group];
  // isOpen кіруецца звонку; інакш меню паказваецца на :hover
  const visibility =
    isOpen === undefined
      ? `hidden ${groupClasses.show}`
      : isOpen
        ? 'flex'
        : 'hidden';

  const renderPanel = (
    items: HoverMenuItem[] | undefined,
    position: string
  ) => {
    if (!items?.length) return null;
    return (
      <div
        className={`${PANEL_BASE} ${position} ${visibility} ${
          zIndex === 20 ? 'z-20' : 'z-10'
        }`}
      >
        <div className={CARD_CLASSES}>
          {items.map(item => (
            <button
              key={item.label}
              className={`${ITEM_CLASSES} ${item.danger ? 'text-red-600' : ''}`}
              onClick={event => {
                event.stopPropagation();
                item.onClick();
              }}
              onMouseEnter={
                item.highlightMarkerOnHover
                  ? () => setMarkerHighlighted(true)
                  : undefined
              }
              onMouseLeave={
                item.highlightMarkerOnHover
                  ? () => setMarkerHighlighted(false)
                  : undefined
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <span
      className={`relative ${groupClasses.group} ${markerClassName} ${
        markerHighlighted ? '!bg-red-100 rounded' : ''
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {marker}
      {children}
      {renderPanel(above, PANEL_ABOVE)}
      {renderPanel(below, PANEL_BELOW)}
    </span>
  );
}
