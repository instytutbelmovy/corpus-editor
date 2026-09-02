import { LinguisticTag } from './types';

// Адзінае апісаньне граматычных тэгаў GrammarDB: коды, назвы і пазыцыі ў тэгу.
// Адсюль жывуць і разбор тэгу (для паказу), і зборка тэгу (ручны ўвод).

export type CategoryKey =
  | 'partOfSpeech'
  | 'properName'
  | 'animacy'
  | 'personhood'
  | 'abbreviation'
  | 'gender'
  | 'declension'
  | 'case'
  | 'number'
  | 'adjectiveType'
  | 'degree'
  | 'adverbFunction'
  | 'inflectionType'
  | 'numeralType'
  | 'numeralStructure'
  | 'numeralInflection'
  | 'pronounType'
  | 'person'
  | 'verbTransitivity'
  | 'verbAspect'
  | 'verbReflexivity'
  | 'verbConjugation'
  | 'verbTense'
  | 'verbMood'
  | 'participleType'
  | 'participleForm'
  | 'adverbOrigin'
  | 'conjunctionType';

export type LinguisticCategories = Record<CategoryKey, string | null>;

// Коды катэгорый ня трэба паказваць у сьпісе варыянтаў — толькі ў ручным уводзе
interface CodeOption {
  value: string;
  label: string;
  hideInSummary?: boolean;
}

// Пусты код: значэньне не пазначана ў тэгу
const EMPTY_CODES = ['.', 'X'];

export const PART_OF_SPEECH_LABELS: Record<string, string> = {
  N: 'назоўнік',
  A: 'прыметнік',
  M: 'лічэбнік',
  S: 'займеньнік',
  V: 'дзеяслоў',
  P: 'дзеепрыметнік',
  R: 'прыслоўе',
  C: 'злучнік',
  I: 'прыназоўнік',
  E: 'часціца',
  Y: 'выклічнік',
  Z: 'пабочнае слова',
  W: 'прэдыкатыў',
  F: 'частка',
  K: 'абрэвіятура',
};

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  partOfSpeech: 'Частка мовы',
  properName: 'Уласнае/агульнае',
  animacy: 'Адушаўлёнасць',
  personhood: 'Асабовасць',
  abbreviation: 'Скарачэньне',
  gender: 'Род',
  declension: 'Скланеньне',
  case: 'Склон',
  number: 'Лік',
  adjectiveType: 'Тып прыметніка',
  degree: 'Ступень',
  adverbFunction: 'Функцыя прыслоўя',
  inflectionType: 'Тып змены',
  numeralType: 'Тып лічэбніка',
  numeralStructure: 'Структура лічэбніка',
  numeralInflection: 'Зменлівасць лічэбніка',
  pronounType: 'Тып займеньніка',
  person: 'Асоба',
  verbTransitivity: 'Пераходнасць дзеяслова',
  verbAspect: 'Від дзеяслова',
  verbReflexivity: 'Зваротнасць дзеяслова',
  verbConjugation: 'Спражэньне дзеяслова',
  verbTense: 'Час дзеяслова',
  verbMood: 'Лад дзеяслова',
  participleType: 'Тып дзеепрыметніка',
  participleForm: 'Форма дзеепрыметніка',
  adverbOrigin: 'Паходжаньне прыслоўя',
  conjunctionType: 'Тып злучніка',
};

const options = (entries: Record<string, string>): CodeOption[] =>
  Object.entries(entries).map(([value, label]) => ({ value, label }));

export const CATEGORY_CODES: Record<CategoryKey, CodeOption[]> = {
  partOfSpeech: options(PART_OF_SPEECH_LABELS),
  properName: options({ C: 'агульны', P: 'уласны' }),
  animacy: options({ A: 'адушаўлёны', I: 'неадушаўлёны' }),
  personhood: options({ P: 'асабовы', I: 'неасабовы' }),
  abbreviation: [
    { value: 'B', label: 'скарачэньне' },
    // Адсутнасьць скарачэньня асобна не паказваем
    { value: 'N', label: 'не скарачэньне', hideInSummary: true },
  ],
  gender: options({
    M: 'мужчынскі',
    F: 'жаночы',
    N: 'ніякі',
    C: 'агульны',
    S: 'субстантываваны',
    U: 'субстантываны множналікавы',
    P: 'толькі множны лік/адсутны',
    '0': 'адсутнасьць роду',
    '1': 'адсутнасьць форм',
  }),
  declension: options({
    '0': 'нескланяльны',
    '1': '1 скланеньне',
    '2': '2 скланеньне',
    '3': '3 скланеньне',
    '4': 'рознаскланяльны',
    '5': "ад'ектыўны тып скланеньня",
    '6': 'зьмешаны тып скланеньня',
    '7': 'множналікавы',
  }),
  case: options({
    N: 'назоўны',
    G: 'родны',
    D: 'давальны',
    A: 'вінавальны',
    I: 'творны',
    L: 'месны',
    V: 'клічны',
  }),
  number: options({ S: 'адзіночны', P: 'множны' }),
  adjectiveType: options({
    Q: 'якасны',
    R: 'адносны',
    P: 'прыналежны',
    '0': 'нескланяльны',
  }),
  degree: options({ P: 'станоўчая', C: 'вышэйшая', S: 'найвышэйшая' }),
  adverbFunction: options({ R: 'у функцыі прыслоўя' }),
  inflectionType: options({
    N: 'як у назоўніка',
    A: 'як у прыметніка',
    '0': 'нязьменны',
  }),
  numeralType: options({
    C: 'колькасны',
    O: 'парадкавы',
    K: 'зборны',
    F: 'дробавы',
  }),
  numeralStructure: options({ S: 'просты', C: 'складаны' }),
  numeralInflection: options({ '0': 'нескланяльны' }),
  pronounType: options({
    P: 'асабовы',
    R: 'зваротны',
    S: 'прыналежны',
    D: 'указальны',
    E: 'азначальны',
    L: 'пытальна-адносны',
    N: 'адмоўны',
    F: 'няпэўны',
  }),
  person: options({
    '1': 'першая',
    '2': 'другая',
    '3': 'трэцяя',
    '0': 'безасабовы',
  }),
  verbTransitivity: options({
    T: 'пераходны',
    I: 'непераходны',
    D: 'пераходны/непераходны',
  }),
  verbAspect: options({ P: 'закончанае', M: 'незакончанае' }),
  verbReflexivity: options({ R: 'зваротны', N: 'незваротны' }),
  verbConjugation: options({
    '1': 'першае',
    '2': 'другое',
    '3': 'рознаспрагальны',
  }),
  verbTense: options({
    R: 'цяперашні',
    P: 'прошлы',
    F: 'будучы',
    I: 'загадны',
    '0': 'інфінітыў',
  }),
  verbMood: options({ G: 'дзеепрыслоўе' }),
  participleType: options({ A: 'незалежны', P: 'залежны' }),
  participleForm: options({ R: 'кароткая форма' }),
  adverbOrigin: options({
    N: 'ад назоўнікаў',
    A: 'ад прыметнікаў',
    M: 'ад лічэбнікаў',
    S: 'ад займеньнікаў',
    G: 'ад дзеепрыслоўяў',
    V: 'ад дзеясловаў',
    E: 'ад часціц',
    I: 'ад прыназоўнікаў',
  }),
  conjunctionType: options({ S: 'падпарадкавальны', K: 'злучальны' }),
};

// Пазыцыі катэгорый у paradigmTag пасьля літары часьціны мовы
const PARADIGM_SCHEMA: Record<string, CategoryKey[]> = {
  N: [
    'properName',
    'animacy',
    'personhood',
    'abbreviation',
    'gender',
    'declension',
  ],
  A: ['adjectiveType', 'degree'],
  M: ['inflectionType', 'numeralType', 'numeralStructure'],
  S: ['inflectionType', 'pronounType', 'person'],
  V: ['verbTransitivity', 'verbAspect', 'verbReflexivity', 'verbConjugation'],
  P: ['participleType', 'verbTense', 'verbAspect'],
  R: ['adverbOrigin'],
  C: ['conjunctionType'],
};

type Codes = Partial<Record<CategoryKey, string>>;

interface FormCodec {
  // Катэгорыі, якія бяруцца з formTag (для ручнога ўводу)
  keys: CategoryKey[];
  parse: (formTag: string) => Codes;
  build: (codes: Codes) => string;
}

const readPositions = (formTag: string, keys: CategoryKey[]): Codes => {
  const codes: Codes = {};
  keys.forEach((key, index) => {
    const code = formTag[index];
    if (code && !EMPTY_CODES.includes(code)) {
      codes[key] = code;
    }
  });
  return codes;
};

const writePositions = (codes: Codes, keys: CategoryKey[]): string =>
  keys.map(key => codes[key] || '.').join('');

const GENDER_CASE_NUMBER: CategoryKey[] = ['gender', 'case', 'number'];

// Формы, у якіх адзін сымбаль азначае асаблівы выпадак (кароткая форма, нескланяльнасьць)
const withSpecialSingleCode = (
  specialKey: CategoryKey,
  specialCode: string,
  keys: CategoryKey[] = GENDER_CASE_NUMBER
): FormCodec => ({
  keys: [specialKey, ...keys],
  parse: formTag =>
    formTag.length === 1 && formTag[0] === specialCode
      ? { [specialKey]: specialCode }
      : readPositions(formTag, keys),
  build: codes =>
    codes[specialKey] ? specialCode : writePositions(codes, keys),
});

const positional = (keys: CategoryKey[]): FormCodec => ({
  keys,
  parse: formTag => readPositions(formTag, keys),
  build: codes => writePositions(codes, keys),
});

const FORM_SCHEMA: Record<string, FormCodec> = {
  // Назоўнік: два сымбалі (склон, лік) або тры (род, склон, лік)
  N: {
    keys: ['case', 'number'],
    parse: formTag =>
      formTag.length === 3
        ? readPositions(formTag, GENDER_CASE_NUMBER)
        : readPositions(formTag, ['case', 'number']),
    build: codes => writePositions(codes, ['case', 'number']),
  },
  A: withSpecialSingleCode('adverbFunction', 'R'),
  M: withSpecialSingleCode('numeralInflection', '0'),
  S: positional(GENDER_CASE_NUMBER),
  P: withSpecialSingleCode('participleForm', 'R'),
  R: positional(['degree']),
  V: {
    keys: ['verbTense', 'verbMood', 'person', 'gender', 'number'],
    parse: formTag => {
      if (!formTag) return {};
      // Інфінітыў
      if (formTag.length === 1 && formTag[0] === '0') {
        return { verbTense: '0' };
      }
      // Загадны лад: асоба і лік
      if (formTag[0] === 'I') {
        return {
          verbTense: 'I',
          ...readPositions(formTag.slice(1), ['person', 'number']),
        };
      }
      // Дзеепрыслоўе
      if (formTag.length === 2 && formTag[1] === 'G') {
        return {
          ...readPositions(formTag, ['verbTense']),
          verbMood: 'G',
        };
      }
      // Прошлы час: род і лік
      if (formTag[0] === 'P') {
        return {
          verbTense: 'P',
          ...readPositions(formTag.slice(1), ['gender', 'number']),
        };
      }
      // Астатнія часы: асоба і лік
      return readPositions(formTag, ['verbTense', 'person', 'number']);
    },
    build: codes => {
      if (codes.verbTense === '0') return '0';
      if (codes.verbTense === 'I') {
        return 'I' + writePositions(codes, ['person', 'number']);
      }
      if (codes.verbMood === 'G') {
        return (codes.verbTense || '.') + 'G';
      }
      if (codes.verbTense === 'P') {
        return 'P' + writePositions(codes, ['gender', 'number']);
      }
      if (codes.verbTense === 'R' || codes.verbTense === 'F') {
        return codes.verbTense + writePositions(codes, ['person', 'number']);
      }
      return '';
    },
  },
};

// Коды, дапушчальныя для катэгорыі пры пэўнай частцы мовы
const ALLOWED_CODES: Record<string, Partial<Record<CategoryKey, string>>> = {
  N: { gender: 'MFNCSUP', case: 'NGDAILV' },
  A: { gender: 'MFNP', case: 'NGDAIL' },
  M: { gender: 'MFNP', case: 'NGDAIL' },
  S: { gender: 'MFN01', case: 'NGDAIL' },
  V: { gender: 'MFN' },
  P: { gender: 'MFNP', case: 'NGDAIL' },
};

// Катэгорыі, якія прапануюцца ў ручным уводзе для часьціны мовы
export function manualCategoryKeys(partOfSpeech: string): CategoryKey[] {
  return [
    ...(PARADIGM_SCHEMA[partOfSpeech] ?? []),
    ...(FORM_SCHEMA[partOfSpeech]?.keys ?? []),
  ];
}

export function categoryOptions(
  partOfSpeech: string,
  key: CategoryKey
): CodeOption[] {
  const allowed = ALLOWED_CODES[partOfSpeech]?.[key];
  const all = CATEGORY_CODES[key];
  if (!allowed) return all;

  return [...allowed]
    .map(code => all.find(option => option.value === code))
    .filter((option): option is CodeOption => option !== undefined);
}

// Тэг → коды катэгорый (тое, што трэба ручному ўводу)
export function parseTagCodes(tag: LinguisticTag): Codes {
  const partOfSpeech = tag.paradigmTag?.[0];
  if (!partOfSpeech || EMPTY_CODES.includes(partOfSpeech)) {
    return {};
  }

  return {
    partOfSpeech,
    ...readPositions(
      tag.paradigmTag.slice(1),
      PARADIGM_SCHEMA[partOfSpeech] ?? []
    ),
    ...(tag.formTag ? FORM_SCHEMA[partOfSpeech]?.parse(tag.formTag) : {}),
  };
}

// Коды катэгорый → тэг
export function buildTag(partOfSpeech: string, codes: Codes): LinguisticTag {
  if (!partOfSpeech) {
    return { paradigmTag: '', formTag: null };
  }

  const paradigmTag =
    partOfSpeech + writePositions(codes, PARADIGM_SCHEMA[partOfSpeech] ?? []);
  const formTag = FORM_SCHEMA[partOfSpeech]?.build(codes) || '';

  return { paradigmTag, formTag: formTag || null };
}

// Тэг → назвы катэгорый па-беларуску (для паказу ў сьпісе варыянтаў)
export function parseLinguisticTag(tag: LinguisticTag): LinguisticCategories {
  const categories = Object.fromEntries(
    (Object.keys(CATEGORY_LABELS) as CategoryKey[]).map(key => [key, null])
  ) as LinguisticCategories;

  const codes = parseTagCodes(tag);
  for (const [key, code] of Object.entries(codes) as [CategoryKey, string][]) {
    const option = CATEGORY_CODES[key].find(entry => entry.value === code);
    if (option && !option.hideInSummary) {
      categories[key] = option.label;
    }
  }

  return categories;
}
