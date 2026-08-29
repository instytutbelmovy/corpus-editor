import { useState, useEffect } from 'react';
import { LinguisticTag } from '../types';
import { BUTTON_STYLES } from '../styles';

interface ManualLinguisticInputProps {
  onSave: (lemma: string, linguisticTag: LinguisticTag) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialValues?: {
    lemma: string;
    partOfSpeech: string;
    categories: Record<string, string>;
  } | null;
}

// Слоўнік катэгорый для кожнай часткі мовы
const categoryOptions = {
  N: {
    // Назоўнік
    properName: [
      { value: 'C', label: 'агульны' },
      { value: 'P', label: 'уласны' },
    ],
    animacy: [
      { value: 'A', label: 'адушаўлёны' },
      { value: 'I', label: 'неадушаўлёны' },
    ],
    personhood: [
      { value: 'P', label: 'асабовы' },
      { value: 'I', label: 'неасабовы' },
    ],
    abbreviation: [
      { value: 'B', label: 'скарачэньне' },
      { value: 'N', label: 'не скарачэньне' },
    ],
    gender: [
      { value: 'M', label: 'мужчынскі' },
      { value: 'F', label: 'жаночы' },
      { value: 'N', label: 'ніякі' },
      { value: 'C', label: 'агульны' },
      { value: 'S', label: 'субстантываваны' },
      { value: 'U', label: 'субстантываваны множналікавы' },
      { value: 'P', label: 'толькі множны лік' },
    ],
    declension: [
      { value: '1', label: '1 скланеньне' },
      { value: '2', label: '2 скланеньне' },
      { value: '3', label: '3 скланеньне' },
      { value: '0', label: 'нескланяльны' },
      { value: '4', label: 'рознаскланяльны' },
      { value: '5', label: "ад'ектыўны тып скланеньня" },
      { value: '6', label: 'зьмешаны тып скланеньня' },
      { value: '7', label: 'множналікавы' },
    ],
    case: [
      { value: 'N', label: 'назоўны' },
      { value: 'G', label: 'родны' },
      { value: 'D', label: 'давальны' },
      { value: 'A', label: 'вінавальны' },
      { value: 'I', label: 'творны' },
      { value: 'L', label: 'месны' },
      { value: 'V', label: 'клічны' },
    ],
    number: [
      { value: 'S', label: 'адзіночны' },
      { value: 'P', label: 'множны' },
    ],
  },
  A: {
    // Прыметнік
    adjectiveType: [
      { value: 'Q', label: 'якасны' },
      { value: 'R', label: 'адносны' },
      { value: 'P', label: 'прыналежны' },
      { value: '0', label: 'нескланяльны' },
    ],
    degree: [
      { value: 'P', label: 'станоўчая' },
      { value: 'C', label: 'вышэйшая' },
      { value: 'S', label: 'найвышэйшая' },
    ],
    adverbFunction: [{ value: 'R', label: 'у функцыі прыслоўя' }],
    gender: [
      { value: 'M', label: 'мужчынскі' },
      { value: 'F', label: 'жаночы' },
      { value: 'N', label: 'ніякі' },
      { value: 'P', label: 'множны лік' },
    ],
    case: [
      { value: 'N', label: 'назоўны' },
      { value: 'G', label: 'родны' },
      { value: 'D', label: 'давальны' },
      { value: 'A', label: 'вінавальны' },
      { value: 'I', label: 'творны' },
      { value: 'L', label: 'месны' },
    ],
    number: [
      { value: 'S', label: 'адзіночны' },
      { value: 'P', label: 'множны' },
    ],
  },
  M: {
    // Лічэбнік
    inflectionType: [
      { value: 'N', label: 'як у назоўніка' },
      { value: 'A', label: 'як у прыметніка' },
      { value: '0', label: 'нязьменны' },
    ],
    numeralType: [
      { value: 'C', label: 'колькасны' },
      { value: 'O', label: 'парадкавы' },
      { value: 'K', label: 'зборны' },
      { value: 'F', label: 'дробавы' },
    ],
    numeralStructure: [
      { value: 'S', label: 'просты' },
      { value: 'C', label: 'складаны' },
    ],
    numeralInflection: [{ value: '0', label: 'нескланяльны' }],
    gender: [
      { value: 'M', label: 'мужчынскі' },
      { value: 'F', label: 'жаночы' },
      { value: 'N', label: 'ніякі' },
      { value: 'P', label: 'адсутны' },
    ],
    case: [
      { value: 'N', label: 'назоўны' },
      { value: 'G', label: 'родны' },
      { value: 'D', label: 'давальны' },
      { value: 'A', label: 'вінавальны' },
      { value: 'I', label: 'творны' },
      { value: 'L', label: 'месны' },
    ],
    number: [
      { value: 'S', label: 'адзіночны' },
      { value: 'P', label: 'множны' },
    ],
  },
  S: {
    // Займеньнік
    inflectionType: [
      { value: 'N', label: 'як у назоўніка' },
      { value: 'A', label: 'як у прыметніка' },
    ],
    pronounType: [
      { value: 'P', label: 'асабовы' },
      { value: 'R', label: 'зваротны' },
      { value: 'S', label: 'прыналежны' },
      { value: 'D', label: 'указальны' },
      { value: 'E', label: 'азначальны' },
      { value: 'L', label: 'пытальна-адносны' },
      { value: 'N', label: 'адмоўны' },
      { value: 'F', label: 'няпэўны' },
    ],
    person: [
      { value: '1', label: 'першая' },
      { value: '2', label: 'другая' },
      { value: '3', label: 'трэцяя' },
      { value: '0', label: 'безасабовы' },
    ],
    gender: [
      { value: 'M', label: 'мужчынскі' },
      { value: 'F', label: 'жаночы' },
      { value: 'N', label: 'ніякі' },
      { value: '0', label: 'адсутнасць роду' },
      { value: '1', label: 'адсутнасць форм' },
    ],
    case: [
      { value: 'N', label: 'назоўны' },
      { value: 'G', label: 'родны' },
      { value: 'D', label: 'давальны' },
      { value: 'A', label: 'вінавальны' },
      { value: 'I', label: 'творны' },
      { value: 'L', label: 'месны' },
    ],
    number: [
      { value: 'S', label: 'адзіночны' },
      { value: 'P', label: 'множны' },
    ],
  },
  V: {
    // Дзеяслоў
    verbTransitivity: [
      { value: 'T', label: 'пераходны' },
      { value: 'I', label: 'непераходны' },
      { value: 'D', label: 'пераходны/непераходны' },
    ],
    verbAspect: [
      { value: 'P', label: 'закончанае' },
      { value: 'M', label: 'незакончанае' },
    ],
    verbReflexivity: [
      { value: 'R', label: 'зваротны' },
      { value: 'N', label: 'незваротны' },
    ],
    verbConjugation: [
      { value: '1', label: 'першае' },
      { value: '2', label: 'другое' },
      { value: '3', label: 'рознаспрагальны' },
    ],
    verbTense: [
      { value: 'R', label: 'цяперашні' },
      { value: 'P', label: 'прошлы' },
      { value: 'F', label: 'будучы' },
      { value: 'I', label: 'загадны' },
      { value: '0', label: 'інфінітыў' },
    ],
    verbMood: [{ value: 'G', label: 'дзеепрыслоўе' }],
    person: [
      { value: '1', label: 'першая' },
      { value: '2', label: 'другая' },
      { value: '3', label: 'трэцяя' },
      { value: '0', label: 'безасабовы' },
    ],
    gender: [
      { value: 'M', label: 'мужчынскі' },
      { value: 'F', label: 'жаночы' },
      { value: 'N', label: 'ніякі' },
    ],
    number: [
      { value: 'S', label: 'адзіночны' },
      { value: 'P', label: 'множны' },
    ],
  },
  P: {
    // Дзеепрыметнік
    participleType: [
      { value: 'A', label: 'незалежны' },
      { value: 'P', label: 'залежны' },
    ],
    participleForm: [{ value: 'R', label: 'кароткая форма' }],
    verbTense: [
      { value: 'R', label: 'цяперашні' },
      { value: 'P', label: 'прошлы' },
      { value: 'F', label: 'будучы' },
    ],
    verbAspect: [
      { value: 'P', label: 'закончанае' },
      { value: 'M', label: 'незакончанае' },
    ],
    gender: [
      { value: 'M', label: 'мужчынскі' },
      { value: 'F', label: 'жаночы' },
      { value: 'N', label: 'ніякі' },
      { value: 'P', label: 'множны лік' },
    ],
    case: [
      { value: 'N', label: 'назоўны' },
      { value: 'G', label: 'родны' },
      { value: 'D', label: 'давальны' },
      { value: 'A', label: 'вінавальны' },
      { value: 'I', label: 'творны' },
      { value: 'L', label: 'месны' },
    ],
    number: [
      { value: 'S', label: 'адзіночны' },
      { value: 'P', label: 'множны' },
    ],
  },
  R: {
    // Прыслоўе
    adverbOrigin: [
      { value: 'N', label: 'ад назоўнікаў' },
      { value: 'A', label: 'ад прыметнікаў' },
      { value: 'M', label: 'ад лічэбнікаў' },
      { value: 'S', label: 'ад займеньнікаў' },
      { value: 'G', label: 'ад дзеепрыслоўяў' },
      { value: 'V', label: 'ад дзеясловаў' },
      { value: 'E', label: 'ад часціц' },
      { value: 'I', label: 'ад прыназоўнікаў' },
    ],
    degree: [
      { value: 'P', label: 'станоўчая' },
      { value: 'C', label: 'вышэйшая' },
      { value: 'S', label: 'найвышэйшая' },
    ],
  },
  C: {
    // Злучнік
    conjunctionType: [
      { value: 'S', label: 'падпарадкавальны' },
      { value: 'K', label: 'злучальны' },
    ],
  },
};

// Слоўнік назваў катэгорый
const categoryLabels: Record<string, string> = {
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

// Слоўнік назваў частак мовы
const partOfSpeechLabels: Record<string, string> = {
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

export function ManualLinguisticInput({
  onSave,
  onCancel,
  isSaving = false,
  initialValues = null,
}: ManualLinguisticInputProps) {
  const [lemma, setLemma] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState<string>('');
  const [categories, setCategories] = useState<Record<string, string>>({});

  // Ініцыялізуем значэньні, калі яны перададзены
  useEffect(() => {
    if (initialValues) {
      setLemma(initialValues.lemma || '');
      setPartOfSpeech(initialValues.partOfSpeech || '');
      setCategories(initialValues.categories || {});
    } else {
      // Скідаем значэньні, калі initialValues не перададзены
      setLemma('');
      setPartOfSpeech('');
      setCategories({});
    }
  }, [initialValues]);

  // Функцыя для генерацыі paradigmTag на аснове выбранных катэгорый
  const generateParadigmTag = (
    pos: string,
    cats: Record<string, string>
  ): string => {
    if (!pos) return '';

    let tag = pos;

    // Дадаем катэгорыі ў залежнасці ад часткі мовы
    if (pos === 'N') {
      tag += cats.properName || '.';
      tag += cats.animacy || '.';
      tag += cats.personhood || '.';
      tag += cats.abbreviation || '.';
      tag += cats.gender || '.';
      tag += cats.declension || '.';
    } else if (pos === 'A') {
      tag += cats.adjectiveType || '.';
      tag += cats.degree || '.';
    } else if (pos === 'M') {
      tag += cats.inflectionType || '.';
      tag += cats.numeralType || '.';
      tag += cats.numeralStructure || '.';
    } else if (pos === 'S') {
      tag += cats.inflectionType || '.';
      tag += cats.pronounType || '.';
      tag += cats.person || '.';
    } else if (pos === 'V') {
      tag += cats.verbTransitivity || '.';
      tag += cats.verbAspect || '.';
      tag += cats.verbReflexivity || '.';
      tag += cats.verbConjugation || '.';
    } else if (pos === 'P') {
      tag += cats.participleType || '.';
      tag += cats.verbTense || '.';
      tag += cats.verbAspect || '.';
    } else if (pos === 'R') {
      tag += cats.adverbOrigin || '.';
    } else if (pos === 'C') {
      tag += cats.conjunctionType || '.';
    }

    return tag;
  };

  // Функцыя для генерацыі formTag
  const generateFormTag = (
    pos: string,
    cats: Record<string, string>
  ): string => {
    if (!pos) return '';

    let tag = '';

    if (pos === 'N') {
      tag += cats.case || '.';
      tag += cats.number || '.';
    } else if (pos === 'A') {
      if (cats.adverbFunction) {
        tag += 'R';
      } else {
        tag += cats.gender || '.';
        tag += cats.case || '.';
        tag += cats.number || '.';
      }
    } else if (pos === 'M') {
      if (cats.numeralInflection) {
        tag += '0';
      } else {
        tag += cats.gender || '.';
        tag += cats.case || '.';
        tag += cats.number || '.';
      }
    } else if (pos === 'S') {
      tag += cats.gender || '.';
      tag += cats.case || '.';
      tag += cats.number || '.';
    } else if (pos === 'V') {
      if (cats.verbTense === '0') {
        tag += '0';
      } else if (cats.verbTense === 'I') {
        tag += 'I';
        tag += cats.person || '.';
        tag += cats.number || '.';
      } else if (cats.verbMood === 'G') {
        tag += cats.verbTense || '.';
        tag += 'G';
      } else if (cats.verbTense === 'P') {
        tag += 'P';
        tag += cats.gender || '.';
        tag += cats.number || '.';
      } else if (cats.verbTense === 'R') {
        // Цяперашні час
        tag += 'R';
        tag += cats.person || '.';
        tag += cats.number || '.';
      } else if (cats.verbTense === 'F') {
        // Будучы час
        tag += 'F';
        tag += cats.person || '.';
        tag += cats.number || '.';
      }
    } else if (pos === 'P') {
      if (cats.participleForm) {
        tag += 'R';
      } else {
        tag += cats.gender || '.';
        tag += cats.case || '.';
        tag += cats.number || '.';
      }
    } else if (pos === 'R') {
      tag += cats.degree || '.';
    }

    return tag;
  };

  const handleCategoryChange = (category: string, value: string) => {
    setCategories(prev => ({
      ...prev,
      [category]: value,
    }));
  };

  const handleSave = () => {
    if (!lemma.trim() || !partOfSpeech) {
      return;
    }

    const paradigmTagValue = generateParadigmTag(partOfSpeech, categories);
    const formTagValue = generateFormTag(partOfSpeech, categories);

    const linguisticTag: LinguisticTag = {
      paradigmTag: paradigmTagValue,
      formTag: formTagValue || null,
    };

    onSave(lemma.trim(), linguisticTag);
  };

  const selectedPartOfSpeech = partOfSpeech as keyof typeof categoryOptions;
  const availableCategories = categoryOptions[selectedPartOfSpeech] || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Ручны ўвод</h3>
      </div>

      <div className="space-y-3">
        {/* Лема */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Лема *
          </label>
          <input
            type="text"
            value={lemma}
            onChange={e => setLemma(e.target.value.replace(/\+/g, '\u0301'))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Увядзіце лему"
          />
        </div>

        {/* Часціна мовы */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Часціна мовы *
          </label>
          <select
            value={partOfSpeech}
            onChange={e => setPartOfSpeech(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Выберыце частку мовы</option>
            {Object.entries(partOfSpeechLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {value} {label}
              </option>
            ))}
          </select>
        </div>

        {/* Катэгорыі ў залежнасці ад часціны мовы */}
        {partOfSpeech && (
          <div className="space-y-3">
            {Object.entries(availableCategories).map(([category, options]) => (
              <div key={category}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {categoryLabels[category]}
                </label>
                <select
                  value={categories[category] || ''}
                  onChange={e => handleCategoryChange(category, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Не выбрана</option>
                  {options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.value} {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Папярэдні прагляд тэгаў */}
        {partOfSpeech && (
          <div className="space-y-2 text-sm mt-6">
            <code className="bg-white px-2 py-1 rounded border">
              {generateParadigmTag(partOfSpeech, categories)}|
              {generateFormTag(partOfSpeech, categories) || 'null'}
            </code>
          </div>
        )}
      </div>

      {/* Кнопкі */}
      <div className="flex space-x-3 pt-4">
        <button
          onClick={handleSave}
          disabled={!lemma.trim() || !partOfSpeech || isSaving}
          className={`flex-1 py-2 px-4 rounded-md ${BUTTON_STYLES.primary}`}
        >
          {isSaving ? 'Захаваньне...' : 'Захаваць'}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className={`flex-1 py-2 px-4 rounded-md ${BUTTON_STYLES.secondary}`}
        >
          Назад
        </button>
      </div>
    </div>
  );
}
