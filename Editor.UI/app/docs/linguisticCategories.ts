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
  | 'formGender'
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

// Коды катэгорый ня трэба паказваць у сьпісе варыянтаў - толькі ў ручным уводзе
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
  E: 'часьціца',
  Y: 'выклічнік',
  Z: 'пабочнае слова',
  W: 'прэдыкатыў',
  F: 'частка',
  K: 'абрэвіятура',
};

// Назвы паводле афіцыйнага сьпісу граматычных катэгорый ГрамБазы. Часьціна мовы заўсёды вядомая там, дзе назва паказваецца, таму ўдакладненьні кшталту "дзеяслова" ня трэба.
export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  partOfSpeech: 'Часьціна мовы',
  properName: 'Уласнасьць',
  animacy: 'Адушаўлёнасьць',
  personhood: 'Асабовасьць',
  abbreviation: 'Скарачэньне',
  gender: 'Род',
  declension: 'Скланеньне',
  // У афіцыйным сьпісе асобнай назвы няма: гэта род словаформы ў адрозьненьне ад роду парадыгмы
  formGender: 'Род формы',
  case: 'Склон',
  number: 'Лік',
  adjectiveType: 'Тып',
  degree: 'Ступень параўнаньня',
  adverbFunction: 'Прыметнік у функцыі прыслоўя',
  inflectionType: 'Словазьмяненьне',
  numeralType: 'Значэньне',
  numeralStructure: 'Форма',
  numeralInflection: 'Нескланяльны',
  pronounType: 'Разрад',
  person: 'Асоба',
  verbTransitivity: 'Пераходнасьць',
  verbAspect: 'Трываньне',
  verbReflexivity: 'Зваротнасьць',
  verbConjugation: 'Спражэньне',
  verbTense: 'Час',
  verbMood: 'Дзеепрыслоўе',
  participleType: 'Стан',
  participleForm: 'Кароткая форма',
  adverbOrigin: 'Спосаб утварэньня',
  conjunctionType: 'Тып',
};

const options = (entries: Record<string, string>): CodeOption[] =>
  Object.entries(entries).map(([value, label]) => ({ value, label }));

// Пазыцыя роду ў парадыгме (N: адзін код на ўсю лему) і ў форме (N: код на канкрэтную словаформу) - розныя катэгорыі, але адны і тыя ж коды.
// Код P у назоўніка і лічэбніка значыць іншае - глядзі CODE_LABEL_OVERRIDES
const GENDER_LABELS: Record<string, string> = {
  M: 'мужчынскі',
  F: 'жаночы',
  N: 'ніякі',
  C: 'агульны',
  S: 'субстантываваны',
  U: 'субстантываваны множналікавы',
  P: 'множны лік',
  '0': 'адсутнасьць роду',
  '1': 'адсутнасьць форм',
};

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
  gender: options(GENDER_LABELS),
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
  formGender: options(GENDER_LABELS),
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
    I: 'загадны лад',
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
    E: 'ад часьціц',
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

// Формы, у якіх пачатковы сымбаль азначае асаблівы выпадак (кароткая форма, нескланяльнасьць);
// астатнія пазыцыі (калі ёсьць) у гэтым выпадку не разьбіраюцца
const withSpecialSingleCode = (
  specialKey: CategoryKey,
  specialCode: string,
  keys: CategoryKey[] = GENDER_CASE_NUMBER
): FormCodec => ({
  keys: [specialKey, ...keys],
  parse: formTag =>
    formTag[0] === specialCode
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
  // Назоўнік: два сымбалі (склон, лік) або тры (род формы, склон, лік).
  // Род формы - асобная катэгорыя ад роду парадыгмы: субстантываваныя і множналікавыя
  // назоўнікі маюць адзін род для лемы (парадыгмы) і другі для канкрэтнай словаформы.
  N: {
    keys: ['formGender', 'case', 'number'],
    parse: formTag =>
      formTag.length === 3
        ? readPositions(formTag, ['formGender', 'case', 'number'])
        : readPositions(formTag, ['case', 'number']),
    build: codes =>
      codes.formGender
        ? writePositions(codes, ['formGender', 'case', 'number'])
        : writePositions(codes, ['case', 'number']),
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

// Коды, дапушчальныя для катэгорыі пры пэўнай часьціне мовы
const ALLOWED_CODES: Record<string, Partial<Record<CategoryKey, string>>> = {
  N: { gender: 'MFNCSUP', formGender: 'MFNP', case: 'NGDAILV' },
  A: { gender: 'MFNP', case: 'NGDAIL' },
  M: { gender: 'MFNP', case: 'NGDAIL' },
  S: { gender: 'MFN01', case: 'NGDAIL' },
  V: { gender: 'MFN' },
  // Дзеепрыметнікі ў GrammarDB бываюць толькі цяперашняга і прошлага часу
  P: { gender: 'MFNP', case: 'NGDAIL', verbTense: 'RP' },
};

// Адзін і той жа код у розных часьцінах мовы значыць рознае.
// Базавыя подпісы ляжаць у CATEGORY_CODES, тут - толькі адхіленьні
const CODE_LABEL_OVERRIDES: Record<
  string,
  Partial<Record<CategoryKey, Record<string, string>>>
> = {
  N: {
    gender: { P: 'толькі множны лік' },
    formGender: { P: 'адсутнасьць роду ў множным ліку' },
  },
  M: { gender: { P: 'адсутны' } },
};

// Подпісы кодаў катэгорыі з улікам часьціны мовы - адзіны шлях ад коду да подпісу
function codeOptions(partOfSpeech: string, key: CategoryKey): CodeOption[] {
  const overrides = CODE_LABEL_OVERRIDES[partOfSpeech]?.[key];
  const all = CATEGORY_CODES[key];
  if (!overrides) return all;

  return all.map(option =>
    overrides[option.value]
      ? { ...option, label: overrides[option.value] }
      : option
  );
}

// Катэгорыі, якія прапануюцца ў ручным уводзе для часьціны мовы
export function manualCategoryKeys(partOfSpeech: string): CategoryKey[] {
  return [
    ...(PARADIGM_SCHEMA[partOfSpeech] ?? []),
    ...(FORM_SCHEMA[partOfSpeech]?.keys ?? []),
  ];
}

export function paradigmCategoryKeys(partOfSpeech: string): CategoryKey[] {
  return PARADIGM_SCHEMA[partOfSpeech] ?? [];
}

export function formCategoryKeys(
  partOfSpeech: string,
  codes: Codes
): CategoryKey[] {
  if (partOfSpeech === 'V') {
    if (codes.verbTense === '0') return ['verbTense'];
    if (codes.verbTense === 'I') return ['verbTense', 'person', 'number'];
    if (codes.verbMood === 'G') return ['verbTense', 'verbMood'];
    return [
      'verbTense',
      'verbMood',
      codes.verbTense === 'P' ? 'gender' : 'person',
      'number',
    ];
  }
  const keys = FORM_SCHEMA[partOfSpeech]?.keys ?? [];
  const special = keys[0];
  if (
    ['adverbFunction', 'numeralInflection', 'participleForm'].includes(
      special
    ) &&
    codes[special]
  )
    return [special];
  return keys;
}

export function categoryOptions(
  partOfSpeech: string,
  key: CategoryKey
): CodeOption[] {
  const allowed = ALLOWED_CODES[partOfSpeech]?.[key];
  const all = codeOptions(partOfSpeech, key);
  if (!allowed) return all;

  return [...allowed]
    .map(code => all.find(option => option.value === code))
    .filter((option): option is CodeOption => option !== undefined);
}

// 'all' - часьціна мовы, катэгорыі парадыгмы і формы разам;
// 'form' - толькі катэгорыі самой словаформы
export type TagScope = 'all' | 'form';

// Тэг -> коды катэгорый (тое, што трэба ручному ўводу)
export function parseTagCodes(
  tag: LinguisticTag,
  scope: TagScope = 'all'
): Codes {
  const partOfSpeech = tag.paradigmTag?.[0];
  if (!partOfSpeech || EMPTY_CODES.includes(partOfSpeech)) {
    return {};
  }

  const formCodes = tag.formTag
    ? (FORM_SCHEMA[partOfSpeech]?.parse(tag.formTag) ?? {})
    : {};
  if (scope === 'form') return formCodes;

  return {
    partOfSpeech,
    ...readPositions(
      tag.paradigmTag.slice(1),
      PARADIGM_SCHEMA[partOfSpeech] ?? []
    ),
    ...formCodes,
  };
}

// Коды катэгорый -> тэг
export function buildTag(partOfSpeech: string, codes: Codes): LinguisticTag {
  if (!partOfSpeech) {
    return { paradigmTag: '', formTag: null };
  }

  const paradigmTag =
    partOfSpeech + writePositions(codes, PARADIGM_SCHEMA[partOfSpeech] ?? []);
  const formTag = FORM_SCHEMA[partOfSpeech]?.build(codes) || '';

  return { paradigmTag, formTag: formTag || null };
}

// Тэг -> назвы катэгорый па-беларуску (для паказу ў сьпісе варыянтаў)
export function parseLinguisticTag(
  tag: LinguisticTag,
  scope: TagScope = 'all'
): LinguisticCategories {
  const categories = Object.fromEntries(
    (Object.keys(CATEGORY_LABELS) as CategoryKey[]).map(key => [key, null])
  ) as LinguisticCategories;

  const partOfSpeech = tag.paradigmTag?.[0] ?? '';
  const codes = parseTagCodes(tag, scope);
  for (const [key, code] of Object.entries(codes) as [CategoryKey, string][]) {
    const option = codeOptions(partOfSpeech, key).find(
      entry => entry.value === code
    );
    if (option && !option.hideInSummary) {
      categories[key] = option.label;
    }
  }

  return categories;
}
