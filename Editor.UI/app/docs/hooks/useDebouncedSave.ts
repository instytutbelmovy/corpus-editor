import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDebouncedSaveOptions {
  value: string;
  // Зьмена ключа скідае поле пад новае значэньне (пераход на іншае слова)
  resetKey: string;
  onSave?: (value: string) => Promise<void>;
  delayMs: number;
}

// Адкладзенае захаваньне трымае ключ і апрацоўшчык таго слова, у якім тэкст быў набраны — інакш яно трапіць у наступнае выбранае слова
interface PendingSave {
  key: string;
  value: string;
  onSave: (value: string) => Promise<void>;
}

// Поле з аўтазахаваньнем пасьля паўзы ва ўводзе і магчымасьцю захаваць неадкладна
export function useDebouncedSave({
  value: initialValue,
  resetKey,
  onSave,
  delayMs,
}: UseDebouncedSaveOptions) {
  const [value, setValue] = useState(initialValue);
  const lastSavedRef = useRef(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRef = useRef<PendingSave | null>(null);
  const keyRef = useRef(resetKey);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Захаваць адкладзенае зараз — перад пераходам на іншае слова ці закрыцьцём панэлі
  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending || pending.value === lastSavedRef.current) return;

    try {
      await pending.onSave(pending.value);
      // Слова ўжо магло зьмяніцца: тады база параўнаньня належыць іншаму слову
      if (keyRef.current === pending.key) {
        lastSavedRef.current = pending.value;
      }
    } catch (error) {
      console.error('Памылка захаваньня:', error);
    }
  }, []);

  useEffect(() => {
    // Тэкст, набраны для папярэдняга слова, захоўваецца ў яго, а не ў новае
    flush();
    keyRef.current = resetKey;
    setValue(initialValue);
    lastSavedRef.current = initialValue;
    // Значэньне бярэцца пад новае слова, таму initialValue тут не залежнасьць
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, flush]);

  useEffect(
    () => () => {
      flush();
    },
    [flush]
  );

  const change = useCallback(
    (next: string) => {
      setValue(next);
      const handler = onSaveRef.current;
      if (!handler) return;

      pendingRef.current = {
        key: keyRef.current,
        value: next,
        onSave: handler,
      };
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(flush, delayMs);
    },
    [flush, delayMs]
  );

  return { value, change, flush };
}
