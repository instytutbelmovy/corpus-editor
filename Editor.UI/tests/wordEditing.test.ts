import { findNextUnresolvedWord } from '@/app/docs/wordEditing';
import {
  DocumentData,
  DocumentHeader,
  LinguisticItem,
  SentenceItemType,
} from '@/app/docs/types';

// Слова: `resolved` азначае, што разьметка ўжо пацьверджаная
const word = (text: string, resolved: boolean): LinguisticItem => ({
  paradigmFormId: null,
  lemma: null,
  linguisticTag: null,
  comment: '',
  metadata: { suggested: null, resolvedOn: resolved ? '2026-01-01' : null },
  text,
  type: SentenceItemType.Word,
  glueNext: false,
});

const punctuation = (text: string): LinguisticItem => ({
  ...word(text, false),
  type: SentenceItemType.Punctuation,
});

// Адзін абзац з адным сказам: словы задаюцца парамі [тэкст, ці разьмечанае]
const documentOf = (items: LinguisticItem[]): DocumentData => ({
  header: { n: 1 } as DocumentHeader,
  paragraphs: [
    {
      id: 1,
      concurrencyStamp: 'p1',
      sentences: [
        {
          id: 1,
          concurrencyStamp: 's1',
          sentenceItems: items.map(linguisticItem => ({
            linguisticItem,
            options: [],
          })),
        },
      ],
    },
  ],
});

const at = (wordIndex: number) => ({
  paragraphId: 1,
  sentenceId: 1,
  wordIndex,
});

describe('findNextUnresolvedWord', () => {
  test('бярэ наступнае неразьмечанае слова пасьля бягучага', () => {
    const data = documentOf([
      word('адзін', true),
      word('два', true),
      word('тры', false),
    ]);

    expect(findNextUnresolvedWord(data, at(1))?.wordIndex).toBe(2);
  });

  test('без бягучага слова бярэ першае неразьмечанае', () => {
    const data = documentOf([word('адзін', true), word('два', false)]);

    expect(findNextUnresolvedWord(data, null)?.wordIndex).toBe(1);
  });

  test('пасьля канца дакумэнта вяртаецца да пачатку', () => {
    const data = documentOf([
      word('адзін', false),
      word('два', true),
      word('тры', true),
    ]);

    expect(findNextUnresolvedWord(data, at(2))?.wordIndex).toBe(0);
  });

  test('бягучае слова не прапануецца, нават калі яно неразьмечанае', () => {
    const data = documentOf([
      word('адзін', true),
      word('два', false),
      word('тры', true),
    ]);

    expect(findNextUnresolvedWord(data, at(1))).toBeNull();
  });

  test('усе словы разьмечаныя - няма куды ісьці', () => {
    const data = documentOf([word('адзін', true), word('два', true)]);

    expect(findNextUnresolvedWord(data, at(0))).toBeNull();
  });

  test('знакі прыпынку прапускаюцца', () => {
    const data = documentOf([
      word('адзін', true),
      punctuation(','),
      word('два', false),
    ]);

    const next = findNextUnresolvedWord(data, at(0));
    expect(next?.wordIndex).toBe(2);
    expect(next?.item.text).toBe('два');
  });

  test('без дакумэнта вяртае null', () => {
    expect(findNextUnresolvedWord(null, at(0))).toBeNull();
  });
});
