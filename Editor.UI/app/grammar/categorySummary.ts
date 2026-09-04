import { LinguisticTag } from '@/app/docs/types';
import {
  parseLinguisticTag,
  CategoryKey,
  CATEGORY_LABELS,
  TagScope,
} from '@/app/docs/linguisticCategories';

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as CategoryKey[];

// Разабраныя катэгорыі тэгу ў чытэльны радок праз коску, у парадку CATEGORY_LABELS
export function summarizeTag(
  tag: LinguisticTag,
  scope: TagScope = 'all'
): string {
  const categories = parseLinguisticTag(tag, scope);
  const values: string[] = [];

  for (const key of CATEGORY_ORDER) {
    const value = categories[key];
    if (value) values.push(value);
  }

  return values.join(', ');
}

// Катэгорыі, якімі тэг варыянту адрозьніваецца ад тэгу парадыгмы (пусты радок, калі нічым): астатняе ўжо паказана ў загалоўку парадыгмы
export function summarizeTagDiff(
  paradigmTag: string,
  variantTag: string
): string {
  if (paradigmTag === variantTag) return '';

  const paradigm = parseLinguisticTag({ paradigmTag, formTag: null });
  const variant = parseLinguisticTag({
    paradigmTag: variantTag,
    formTag: null,
  });

  const values: string[] = [];
  for (const key of CATEGORY_ORDER) {
    const value = variant[key];
    if (value && value !== paradigm[key]) values.push(value);
  }

  return values.join(', ');
}
