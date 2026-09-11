// Люстра Normalizer.GrammarDbSearchNormalize з бэкенду: пошук - прэфіксны LIKE 'query%' па нармалізаваным ключы, таму і падсьвятленьне правяраем як прэфікс, а не адвольны падрадок.

const CHAR_MAP: Record<string, string> = {
  ў: 'у',
  Ў: 'у',
  // Лацінскія i/I у беларускім тэксьце - тое самае, што і
  i: 'і',
  I: 'і',
  "'": 'ʼ',
  '’': 'ʼ',
};

// Націск у ключ пошуку не трапляе ні з базы, ні з поля ўводу
const STRESS_MARKS = ['́', '´', '+'];

// Усё, што не літара, лічба ці злучка/зорка, у ключ не ідзе - як і на бэкендзе
const KEPT = /[\p{L}\p{N}*-]/u;

interface Normalized {
  value: string;
  // positions[i] - індэкс i-га сымбаля ключа ў зыходным радку
  positions: number[];
}

function normalizeForSearch(text: string): Normalized {
  const chars: string[] = [];
  const positions: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (STRESS_MARKS.includes(char)) {
      continue;
    }
    const mapped = CHAR_MAP[char] ?? char.toLowerCase();
    if (mapped === 'ʼ' || KEPT.test(mapped)) {
      chars.push(mapped);
      positions.push(i);
    }
  }

  return { value: chars.join(''), positions };
}

export interface MatchRange {
  start: number;
  end: number;
}

/**
 * Даўжыня прэфікснага супадзеньня запыту з пачаткам `text`, у сымбалях зыходнага радка (тую самую логіку - LIKE 'query%' па нармалізаваным ключы - ужывае пошук на бэкендзе).
 * Вяртае null, калі text не пачынаецца з query.
 */
export function findPrefixMatch(
  text: string,
  query: string
): MatchRange | null {
  const normalizedQuery = normalizeForSearch(query).value;
  if (!normalizedQuery) {
    return null;
  }

  const normalized = normalizeForSearch(text);
  if (!normalized.value.startsWith(normalizedQuery)) {
    return null;
  }

  const start = normalized.positions[0];
  let end = normalized.positions[normalizedQuery.length - 1] + 1;
  // Націск стаіць пасьля сваёй літары - забіраем яго ў супадзеньне, каб не адарваўся
  while (end < text.length && STRESS_MARKS.includes(text[end])) {
    end++;
  }

  return { start, end };
}
