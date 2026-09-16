import { buildTag } from '@/app/docs/linguisticCategories';
import { ParadigmInput, ParadigmVariant } from './types';

export const stressInput = (value: string) => value.replace(/\+/g, '\u0301');

export function nextVariantId(variants: ParadigmVariant[]): string | undefined {
  return [...'abcdefghijklmnopqrstuvwxyz'].find(
    id => !variants.some(v => v.id === id)
  );
}

// Ідэнтыфікатары варыянтаў заўсёды ідуць запар: a, b, c ...
export function relabelVariants(
  variants: ParadigmVariant[]
): ParadigmVariant[] {
  return variants.map((v, i) => ({
    ...v,
    id: 'abcdefghijklmnopqrstuvwxyz'[i],
  }));
}

// Падказкі — толькі граматычныя пазыцыі; словы ўводзіць рэдактар.
export function suggestedFormTags(tag: string): string[] {
  const pos = tag[0];
  if (pos === 'N')
    return [...'SP'].flatMap(number => [...'NGDAILV'].map(c => c + number));
  if (['A', 'P', 'M', 'S'].includes(pos)) {
    return ['MS', 'FS', 'NS', 'PP'].flatMap(([gender, number]) =>
      [...'NGDAIL'].map(
        c => buildTag(pos, { gender, number, case: c }).formTag ?? ''
      )
    );
  }
  if (pos === 'V')
    return [
      '0',
      ...['R', 'F'].flatMap(tense =>
        [...'SP'].flatMap(n => [...'123'].map(p => tense + p + n))
      ),
      'PMS',
      'PFS',
      'PNS',
      'P.P',
      'I2S',
      'I1P',
      'I2P',
    ];
  if (pos === 'R') return ['P', 'C', 'S'];
  return [''];
}

// Поўны стандартны набор пазыцый для тэгу: першая — гэта лема, астатнія пустыя.
export function defaultForms(
  tag: string,
  lemma: string
): ParadigmVariant['forms'] {
  return suggestedFormTags(tag).map((t, i) => ({
    tag: t,
    value: i === 0 ? lemma : '',
  }));
}

export function newVariant(
  id: string,
  lemma: string,
  tag: string
): ParadigmVariant {
  return {
    id,
    lemma,
    tag,
    forms: defaultForms(tag, lemma),
  };
}

export function prepareInput(draft: ParadigmInput): ParadigmInput {
  return {
    ...draft,
    lemma: draft.lemma.trim(),
    meaning: draft.meaning?.trim() || null,
    variants: draft.variants.map(v => ({
      ...v,
      // Без уласнай лемы варыянт бярэ лему парадыгмы.
      lemma: v.lemma.trim() || draft.lemma.trim(),
      // Варыянт без уласных катэгорый пазначаецца пустым тэгам.
      tag: v.tag === draft.tag ? '' : v.tag,
      forms: v.forms
        .filter(f => f.value.trim())
        .map(f => ({ ...f, value: f.value.trim() })),
    })),
  };
}
