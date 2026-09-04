import { useEffect, useState } from 'react';

// Вяртае value з затрымкай delayMs пасьля апошняй зьмены - для аўтаматычнага пошуку па ўводзе
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
