import type { ParsedUrlQuery } from 'querystring';

// Ці належыць URL нашаму дамену (абарона ад адкрытага перанакіраваньня)
export const isValidReturnUrl = (url: string): boolean => {
  try {
    return (
      new URL(url, window.location.origin).origin === window.location.origin
    );
  } catch {
    return false;
  }
};

// Бясьпечны returnTo з query старонкі ўваходу, або null
export function getSafeReturnTo(query: ParsedUrlQuery): string | null {
  const raw = query.returnTo;
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    return isValidReturnUrl(decoded) ? decoded : null;
  } catch {
    return null;
  }
}
