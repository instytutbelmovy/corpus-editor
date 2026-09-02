import { RefObject, useEffect } from 'react';

// Закрывае выпадальны сьпіс пры кліку па-за яго межамі
export function useClickOutside(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  onOutside: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const refList = Array.isArray(refs) ? refs : [refs];

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInside = refList.some(ref => ref.current?.contains(target));
      if (!isInside) {
        onOutside();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  });
}
