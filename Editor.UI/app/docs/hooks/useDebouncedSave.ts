import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDebouncedSaveOptions {
  value: string;
  // Зьмена ключа скідае поле пад новае значэньне (пераход на іншае слова)
  resetKey: string;
  onSave?: (value: string) => Promise<void>;
  delayMs: number;
}

// Поле з аўтазахаваньнем пасьля паўзы ва ўводзе і магчымасьцю захаваць неадкладна
export function useDebouncedSave({
  value: initialValue,
  resetKey,
  onSave,
  delayMs,
}: UseDebouncedSaveOptions) {
  const [value, setValue] = useState(initialValue);
  const valueRef = useRef(initialValue);
  const lastSavedRef = useRef(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const setBoth = (next: string) => {
    valueRef.current = next;
    setValue(next);
  };

  useEffect(() => {
    setBoth(initialValue);
    lastSavedRef.current = initialValue;
    // Значэньне бярэцца пад новае слова, таму initialValue тут не залежнасьць
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  const save = useCallback(async (next: string) => {
    if (!onSaveRef.current || next === lastSavedRef.current) return;
    try {
      await onSaveRef.current(next);
      lastSavedRef.current = next;
    } catch (error) {
      console.error('Памылка захаваньня:', error);
    }
  }, []);

  const change = useCallback(
    (next: string) => {
      setBoth(next);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => save(next), delayMs);
    },
    [save, delayMs]
  );

  // Захаваць зараз — перад пераходам на наступнае слова ці закрыцьцём панэлі
  const flush = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await save(valueRef.current);
  }, [save]);

  return { value, change, flush };
}
