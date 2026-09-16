import {
  formCategoryKeys,
  parseTagCodes,
} from '@/app/docs/linguisticCategories';
import {
  newVariant,
  nextVariantId,
  prepareInput,
  stressInput,
  suggestedFormTags,
} from '@/app/grammar/editing';

test('stress entry matches markup lemma editing', () => {
  expect(stressInput('сло+ва')).toBe('сло\u0301ва');
});

test('adding a variant does not renumber existing variants and stops at z', () => {
  expect(
    nextVariantId([newVariant('a', '', 'N'), newVariant('c', '', 'N')])
  ).toBe('b');
  expect(
    nextVariantId(
      [...'abcdefghijklmnopqrstuvwxyz'].map(id => newVariant(id, '', 'N'))
    )
  ).toBeUndefined();
});

test('suggested slots are grammatical tags, without inventing word forms', () => {
  expect(suggestedFormTags('N')).toContain('NS');
  expect(suggestedFormTags('N')).toContain('GP');
  expect(suggestedFormTags('V')).toContain('0');
  expect(suggestedFormTags('E')).toEqual(['']);
  for (const tag of suggestedFormTags('A')) {
    const codes = parseTagCodes({ paradigmTag: 'A', formTag: tag }, 'form');
    expect(codes.gender).toBeDefined();
    expect(codes.case).toBeDefined();
    expect(codes.number).toBeDefined();
  }
});

test('submission removes empty suggested slots, preserves original tags and leaves draft intact', () => {
  const draft = {
    lemma: ' слова ',
    tag: 'Nunknown',
    meaning: ' ',
    variants: [
      {
        ...newVariant('c', ' слова ', 'Nunknown'),
        forms: [
          { value: ' слова ', tag: 'XNS' },
          { value: ' ', tag: 'GP' },
        ],
      },
    ],
  };
  const input = prepareInput(draft);
  expect(input.variants[0].forms).toEqual([{ value: 'слова', tag: 'XNS' }]);
  expect(input.variants[0].id).toBe('c');
  expect(input.tag).toBe('Nunknown');
  expect(draft.variants[0].forms).toHaveLength(2);
});

test('verb forms expose categories according to their tense and mood', () => {
  expect(formCategoryKeys('V', { verbTense: '0' })).toEqual(['verbTense']);
  expect(formCategoryKeys('V', { verbTense: 'P' })).toContain('gender');
  expect(formCategoryKeys('V', { verbTense: 'P' })).not.toContain('person');
  expect(formCategoryKeys('V', { verbTense: 'R', verbMood: 'G' })).toEqual([
    'verbTense',
    'verbMood',
  ]);
});
