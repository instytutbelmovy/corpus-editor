import { RefObject, useEffect, useRef } from 'react';

// Закрывае выпадальны сьпіс пры кліку па-за яго межамі
export function useClickOutside(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  onOutside: () => void,
  enabled = true
) {
  // Спасылкі трымаем у ref, каб слухач не перавешваўся на кожны рэндар
  const refsRef = useRef(refs);
  refsRef.current = refs;
  const onOutsideRef = useRef(onOutside);
  onOutsideRef.current = onOutside;

  useEffect(() => {
    if (!enabled) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const current = refsRef.current;
      const refList = Array.isArray(current) ? current : [current];
      const isInside = refList.some(ref => ref.current?.contains(target));
      if (!isInside) {
        onOutsideRef.current();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [enabled]);
}
