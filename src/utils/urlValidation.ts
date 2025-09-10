/**
 * Функцыя для праверкі лякальнасці URL
 * Правярае, што URL належыць да нашага дамена
 * 
 * @param url - URL для праверкі
 * @returns true, калі URL лякальны, false у адваротным выпадку
 */
export const isValidReturnUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    // Правяраем, што URL належыць да нашага дамена
    return parsedUrl.origin === window.location.origin;
  } catch {
    // Калі URL недапушчальны, вяртаем false
    return false;
  }
};
