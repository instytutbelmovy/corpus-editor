import { LinguisticTag } from './types';

// Лінгвістычныя катэгорыі для разбору тэгаў
export interface LinguisticCategories {
  partOfSpeech: string | null; // 1 - частка мовы
  properName: string | null; // 2 - уласнае/агульнае
  animacy: string | null; // 3 - адушаўлёнасць
  personhood: string | null; // 4 - асабовасць
  abbreviation: string | null; // 5 - скарачэнне
  gender: string | null; // 6 - род
  declension: string | null; // 7 - скланенне
  case: string | null; // 8 - склон
  number: string | null; // 9 - лік
  adjectiveType: string | null; // 10 - тып прыметніка
  degree: string | null; // 11 - ступень
  adverbFunction: string | null; // 12 - функцыя прыслоўя
  inflectionType: string | null; // 13 - тып змены
  numeralType: string | null; // 14 - тып лічэбніка
  numeralStructure: string | null; // 15 - структура лічэбніка
  numeralInflection: string | null; // 16 - зменлівасць лічэбніка
  pronounType: string | null; // 17 - тып займенніка
  person: string | null; // 18 - асоба
  verbTransitivity: string | null; // 19 - пераходнасць дзеяслова
  verbAspect: string | null; // 20 - від дзеяслова
  verbReflexivity: string | null; // 21 - зваротнасць дзеяслова
  verbConjugation: string | null; // 22 - спражэнне дзеяслова
  verbTense: string | null; // 23 - час дзеяслова
  verbMood: string | null; // 24 - лад дзеяслова
  participleType: string | null; // 25 - тып дзеепрыметніка
  participleForm: string | null; // 26 - форма дзеепрыметніка
  adverbOrigin: string | null; // 27 - паходжанне прыслоўя
  conjunctionType: string | null; // 28 - тып злучніка
}

// Функцыя для разбору LinguisticTag на катэгорыі
export function parseLinguisticTag(tag: LinguisticTag): LinguisticCategories {
  const categories: LinguisticCategories = {
    partOfSpeech: null,
    properName: null,
    animacy: null,
    personhood: null,
    abbreviation: null,
    gender: null,
    declension: null,
    case: null,
    number: null,
    adjectiveType: null,
    degree: null,
    adverbFunction: null,
    inflectionType: null,
    numeralType: null,
    numeralStructure: null,
    numeralInflection: null,
    pronounType: null,
    person: null,
    verbTransitivity: null,
    verbAspect: null,
    verbReflexivity: null,
    verbConjugation: null,
    verbTense: null,
    verbMood: null,
    participleType: null,
    participleForm: null,
    adverbOrigin: null,
    conjunctionType: null,
  };

  if (!tag.paradigmTag || tag.paradigmTag.length === 0) {
    return categories;
  }

  const pos = tag.paradigmTag[0];
  if (pos === '.' || pos === 'X') {
    return categories;
  }

  // Слоўнікі для перакладу
  const posMapping: Record<string, string> = {
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

  const genderMapping: Record<string, string> = {
    M: 'мужчынскі',
    F: 'жаночы',
    N: 'ніякі',
    C: 'агульны',
    S: 'субстантываваны',
    U: 'субстантываны множналікавы',
    P: 'толькі множны лік/адсутны',
    '0': 'адсутнасьць роду',
    '1': 'адсутнасьць форм',
  };

  const caseMapping: Record<string, string> = {
    N: 'назоўны',
    G: 'родны',
    D: 'давальны',
    A: 'вінавальны',
    I: 'творны',
    L: 'месны',
    V: 'клічны',
  };

  const numberMapping: Record<string, string> = {
    S: 'адзіночны',
    P: 'множны',
  };

  const degreeMapping: Record<string, string> = {
    P: 'станоўчая',
    C: 'вышэйшая',
    S: 'найвышэйшая',
  };

  const inflectionTypeMapping: Record<string, string> = {
    N: 'як у назоўніка',
    A: 'як у прыметніка',
    '0': 'нязьменны',
  };

  const personMapping: Record<string, string> = {
    '1': 'першая',
    '2': 'другая',
    '3': 'трэцяя',
    '0': 'безасабовы',
  };

  const aspectMapping: Record<string, string> = {
    P: 'закончанае',
    M: 'незакончанае',
  };

  const tenseMapping: Record<string, string> = {
    R: 'цяперашні',
    P: 'прошлы',
    F: 'будучы',
    I: 'загадны',
    '0': 'інфінітыў',
  };

  // Усталяванне часткі мовы
  categories.partOfSpeech = posMapping[pos] || null;

  // Разбор у залежнасці ад часткі мовы
  if (pos === 'N') {
    // Назоўнік
    if (
      tag.paradigmTag.length > 1 &&
      tag.paradigmTag[1] !== '.' &&
      tag.paradigmTag[1] !== 'X'
    ) {
      categories.properName = tag.paradigmTag[1] === 'C' ? 'агульны' : 'уласны';
    }
    if (
      tag.paradigmTag.length > 2 &&
      tag.paradigmTag[2] !== '.' &&
      tag.paradigmTag[2] !== 'X'
    ) {
      categories.animacy =
        tag.paradigmTag[2] === 'A' ? 'адушаўлёны' : 'неадушаўлёны';
    }
    if (
      tag.paradigmTag.length > 3 &&
      tag.paradigmTag[3] !== '.' &&
      tag.paradigmTag[3] !== 'X'
    ) {
      categories.personhood =
        tag.paradigmTag[3] === 'P' ? 'асабовы' : 'неасабовы';
    }
    if (
      tag.paradigmTag.length > 4 &&
      tag.paradigmTag[4] !== '.' &&
      tag.paradigmTag[4] !== 'X'
    ) {
      categories.abbreviation = tag.paradigmTag[4] === 'B' ? 'скарачэньне' : '';
    }
    if (
      tag.paradigmTag.length > 5 &&
      tag.paradigmTag[5] !== '.' &&
      tag.paradigmTag[5] !== 'X'
    ) {
      categories.gender = genderMapping[tag.paradigmTag[5]] || null;
    }
    if (
      tag.paradigmTag.length > 6 &&
      tag.paradigmTag[6] !== '.' &&
      tag.paradigmTag[6] !== 'X'
    ) {
      const declensionMap: Record<string, string> = {
        '0': 'нескланяльны',
        '1': '1 скланеньне',
        '2': '2 скланеньне',
        '3': '3 скланеньне',
        '4': 'рознаскланяльны',
        '5': "ад'ектыўны тып скланеньня",
        '6': 'зьмешаны тып скланеньня',
        '7': 'множналікавы',
      };
      categories.declension = declensionMap[tag.paradigmTag[6]] || null;
    }

    // Разбор formTag для назоўніка
    if (tag.formTag) {
      if (tag.formTag.length === 2) {
        if (tag.formTag[0] !== '.' && tag.formTag[0] !== 'X') {
          categories.case = caseMapping[tag.formTag[0]] || null;
        }
        if (tag.formTag[1] !== '.' && tag.formTag[1] !== 'X') {
          categories.number = numberMapping[tag.formTag[1]] || null;
        }
      } else if (tag.formTag.length === 3) {
        if (tag.formTag[0] !== '.' && tag.formTag[0] !== 'X') {
          categories.gender = genderMapping[tag.formTag[0]] || null;
        }
        if (tag.formTag[1] !== '.' && tag.formTag[1] !== 'X') {
          categories.case = caseMapping[tag.formTag[1]] || null;
        }
        if (tag.formTag[2] !== '.' && tag.formTag[2] !== 'X') {
          categories.number = numberMapping[tag.formTag[2]] || null;
        }
      }
    }
  } else if (pos === 'A') {
    // Прыметнік
    if (
      tag.paradigmTag.length > 1 &&
      tag.paradigmTag[1] !== '.' &&
      tag.paradigmTag[1] !== 'X'
    ) {
      const adjTypeMap: Record<string, string> = {
        Q: 'якасны',
        R: 'адносны',
        P: 'прыналежны',
        '0': 'нескланяльны',
      };
      categories.adjectiveType = adjTypeMap[tag.paradigmTag[1]] || null;
    }
    if (
      tag.paradigmTag.length > 2 &&
      tag.paradigmTag[2] !== '.' &&
      tag.paradigmTag[2] !== 'X'
    ) {
      categories.degree = degreeMapping[tag.paradigmTag[2]] || null;
    }

    // Разбор formTag для прыметніка
    if (tag.formTag) {
      if (
        tag.formTag.length === 1 &&
        tag.formTag[0] !== '.' &&
        tag.formTag[0] !== 'X'
      ) {
        if (tag.formTag[0] === 'R') {
          categories.adverbFunction = 'у функцыі прыслоўя';
        }
      } else {
        if (
          tag.formTag.length > 0 &&
          tag.formTag[0] !== '.' &&
          tag.formTag[0] !== 'X'
        ) {
          categories.gender = genderMapping[tag.formTag[0]] || null;
        }
        if (
          tag.formTag.length > 1 &&
          tag.formTag[1] !== '.' &&
          tag.formTag[1] !== 'X'
        ) {
          categories.case = caseMapping[tag.formTag[1]] || null;
        }
        if (
          tag.formTag.length > 2 &&
          tag.formTag[2] !== '.' &&
          tag.formTag[2] !== 'X'
        ) {
          categories.number = numberMapping[tag.formTag[2]] || null;
        }
      }
    }
  } else if (pos === 'M') {
    // Лічэбнік
    if (
      tag.paradigmTag.length > 1 &&
      tag.paradigmTag[1] !== '.' &&
      tag.paradigmTag[1] !== 'X'
    ) {
      categories.inflectionType =
        inflectionTypeMapping[tag.paradigmTag[1]] || null;
    }
    if (
      tag.paradigmTag.length > 2 &&
      tag.paradigmTag[2] !== '.' &&
      tag.paradigmTag[2] !== 'X'
    ) {
      const numeralTypeMap: Record<string, string> = {
        C: 'колькасны',
        O: 'парадкавы',
        K: 'зборны',
        F: 'дробавы',
      };
      categories.numeralType = numeralTypeMap[tag.paradigmTag[2]] || null;
    }
    if (
      tag.paradigmTag.length > 3 &&
      tag.paradigmTag[3] !== '.' &&
      tag.paradigmTag[3] !== 'X'
    ) {
      const structureMap: Record<string, string> = {
        S: 'просты',
        C: 'складаны',
      };
      categories.numeralStructure = structureMap[tag.paradigmTag[3]] || null;
    }

    // Разбор formTag для лічэбніка
    if (tag.formTag) {
      if (
        tag.formTag.length === 1 &&
        tag.formTag[0] !== '.' &&
        tag.formTag[0] !== 'X'
      ) {
        if (tag.formTag[0] === '0') {
          categories.numeralInflection = 'нескланяльны';
        }
      } else {
        if (
          tag.formTag.length > 0 &&
          tag.formTag[0] !== '.' &&
          tag.formTag[0] !== 'X'
        ) {
          categories.gender = genderMapping[tag.formTag[0]] || null;
        }
        if (
          tag.formTag.length > 1 &&
          tag.formTag[1] !== '.' &&
          tag.formTag[1] !== 'X'
        ) {
          categories.case = caseMapping[tag.formTag[1]] || null;
        }
        if (
          tag.formTag.length > 2 &&
          tag.formTag[2] !== '.' &&
          tag.formTag[2] !== 'X'
        ) {
          categories.number = numberMapping[tag.formTag[2]] || null;
        }
      }
    }
  } else if (pos === 'S') {
    // Займеньнік
    if (
      tag.paradigmTag.length > 1 &&
      tag.paradigmTag[1] !== '.' &&
      tag.paradigmTag[1] !== 'X'
    ) {
      categories.inflectionType =
        inflectionTypeMapping[tag.paradigmTag[1]] || null;
    }
    if (
      tag.paradigmTag.length > 2 &&
      tag.paradigmTag[2] !== '.' &&
      tag.paradigmTag[2] !== 'X'
    ) {
      const pronounTypeMap: Record<string, string> = {
        P: 'асабовы',
        R: 'зваротны',
        S: 'прыналежны',
        D: 'указальны',
        E: 'азначальны',
        L: 'пытальна-адносны',
        N: 'адмоўны',
        F: 'няпэўны',
      };
      categories.pronounType = pronounTypeMap[tag.paradigmTag[2]] || null;
    }
    if (
      tag.paradigmTag.length > 3 &&
      tag.paradigmTag[3] !== '.' &&
      tag.paradigmTag[3] !== 'X'
    ) {
      categories.person = personMapping[tag.paradigmTag[3]] || null;
    }

    // Разбор formTag для займеньніка
    if (tag.formTag) {
      if (
        tag.formTag.length > 0 &&
        tag.formTag[0] !== '.' &&
        tag.formTag[0] !== 'X'
      ) {
        categories.gender = genderMapping[tag.formTag[0]] || null;
      }
      if (
        tag.formTag.length > 1 &&
        tag.formTag[1] !== '.' &&
        tag.formTag[1] !== 'X'
      ) {
        categories.case = caseMapping[tag.formTag[1]] || null;
      }
      if (
        tag.formTag.length > 2 &&
        tag.formTag[2] !== '.' &&
        tag.formTag[2] !== 'X'
      ) {
        categories.number = numberMapping[tag.formTag[2]] || null;
      }
    }
  } else if (pos === 'V') {
    // Дзеяслоў
    if (
      tag.paradigmTag.length > 1 &&
      tag.paradigmTag[1] !== '.' &&
      tag.paradigmTag[1] !== 'X'
    ) {
      const transitivityMap: Record<string, string> = {
        T: 'пераходны',
        I: 'непераходны',
        D: 'пераходны/непераходны',
      };
      categories.verbTransitivity = transitivityMap[tag.paradigmTag[1]] || null;
    }
    if (
      tag.paradigmTag.length > 2 &&
      tag.paradigmTag[2] !== '.' &&
      tag.paradigmTag[2] !== 'X'
    ) {
      categories.verbAspect = aspectMapping[tag.paradigmTag[2]] || null;
    }
    if (
      tag.paradigmTag.length > 3 &&
      tag.paradigmTag[3] !== '.' &&
      tag.paradigmTag[3] !== 'X'
    ) {
      const reflexivityMap: Record<string, string> = {
        R: 'зваротны',
        N: 'незваротны',
      };
      categories.verbReflexivity = reflexivityMap[tag.paradigmTag[3]] || null;
    }
    if (
      tag.paradigmTag.length > 4 &&
      tag.paradigmTag[4] !== '.' &&
      tag.paradigmTag[4] !== 'X'
    ) {
      const conjugationMap: Record<string, string> = {
        '1': 'першае',
        '2': 'другое',
        '3': 'рознаспрагальны',
      };
      categories.verbConjugation = conjugationMap[tag.paradigmTag[4]] || null;
    }

    // Разбор formTag для дзеяслова
    if (tag.formTag) {
      if (tag.formTag.length === 1 && tag.formTag[0] === '0') {
        categories.verbTense = tenseMapping[tag.formTag[0]] || null;
      } else if (tag.formTag.length > 0) {
        if (tag.formTag[0] === 'I') {
          // Загадны лад
          categories.verbTense = tenseMapping[tag.formTag[0]] || null;
          if (
            tag.formTag.length > 1 &&
            tag.formTag[1] !== '.' &&
            tag.formTag[1] !== 'X'
          ) {
            categories.person = personMapping[tag.formTag[1]] || null;
          }
          if (
            tag.formTag.length > 2 &&
            tag.formTag[2] !== '.' &&
            tag.formTag[2] !== 'X'
          ) {
            categories.number = numberMapping[tag.formTag[2]] || null;
          }
        } else if (tag.formTag.length === 2 && tag.formTag[1] === 'G') {
          // Дзеепрыслоўе
          categories.verbTense = tenseMapping[tag.formTag[0]] || null;
          categories.verbMood = 'дзеепрыслоўе';
        } else if (tag.formTag[0] === 'P') {
          // Мінулы час
          categories.verbTense = tenseMapping[tag.formTag[0]] || null;
          if (
            tag.formTag.length > 1 &&
            tag.formTag[1] !== '.' &&
            tag.formTag[1] !== 'X'
          ) {
            categories.gender = genderMapping[tag.formTag[1]] || null;
          }
          if (
            tag.formTag.length > 2 &&
            tag.formTag[2] !== '.' &&
            tag.formTag[2] !== 'X'
          ) {
            categories.number = numberMapping[tag.formTag[2]] || null;
          }
        } else {
          // Іншыя формы
          if (
            tag.formTag.length > 0 &&
            tag.formTag[0] !== '.' &&
            tag.formTag[0] !== 'X'
          ) {
            categories.verbTense = tenseMapping[tag.formTag[0]] || null;
          }
          if (
            tag.formTag.length > 1 &&
            tag.formTag[1] !== '.' &&
            tag.formTag[1] !== 'X'
          ) {
            categories.person = personMapping[tag.formTag[1]] || null;
          }
          if (
            tag.formTag.length > 2 &&
            tag.formTag[2] !== '.' &&
            tag.formTag[2] !== 'X'
          ) {
            categories.number = numberMapping[tag.formTag[2]] || null;
          }
        }
      }
    }
  } else if (pos === 'P') {
    // Дзеепрыметнік
    if (
      tag.paradigmTag.length > 1 &&
      tag.paradigmTag[1] !== '.' &&
      tag.paradigmTag[1] !== 'X'
    ) {
      const participleTypeMap: Record<string, string> = {
        A: 'незалежны',
        P: 'залежны',
      };
      categories.participleType = participleTypeMap[tag.paradigmTag[1]] || null;
    }
    if (
      tag.paradigmTag.length > 2 &&
      tag.paradigmTag[2] !== '.' &&
      tag.paradigmTag[2] !== 'X'
    ) {
      categories.verbTense = tenseMapping[tag.paradigmTag[2]] || null;
    }
    if (
      tag.paradigmTag.length > 3 &&
      tag.paradigmTag[3] !== '.' &&
      tag.paradigmTag[3] !== 'X'
    ) {
      categories.verbAspect = aspectMapping[tag.paradigmTag[3]] || null;
    }

    // Разбор formTag для дзеепрыметніка
    if (tag.formTag) {
      if (tag.formTag.length > 0 && tag.formTag[0] === 'R') {
        categories.participleForm = 'кароткая форма';
      } else {
        if (
          tag.formTag.length > 0 &&
          tag.formTag[0] !== '.' &&
          tag.formTag[0] !== 'X'
        ) {
          categories.gender = genderMapping[tag.formTag[0]] || null;
        }
        if (
          tag.formTag.length > 1 &&
          tag.formTag[1] !== '.' &&
          tag.formTag[1] !== 'X'
        ) {
          categories.case = caseMapping[tag.formTag[1]] || null;
        }
        if (
          tag.formTag.length > 2 &&
          tag.formTag[2] !== '.' &&
          tag.formTag[2] !== 'X'
        ) {
          categories.number = numberMapping[tag.formTag[2]] || null;
        }
      }
    }
  } else if (pos === 'R') {
    // Прыслоўе
    if (
      tag.paradigmTag.length > 1 &&
      tag.paradigmTag[1] !== '.' &&
      tag.paradigmTag[1] !== 'X'
    ) {
      const originMap: Record<string, string> = {
        N: 'ад назоўнікаў',
        A: 'ад прыметнікаў',
        M: 'ад лічэбнікаў',
        S: 'ад займеннікаў',
        G: 'ад дзеепрыслоўяў',
        V: 'ад дзеясловаў',
        E: 'ад часціц',
        I: 'ад прыназоўнікаў',
      };
      categories.adverbOrigin = originMap[tag.paradigmTag[1]] || null;
    }

    // Разбор formTag для прыслоўя
    if (
      tag.formTag &&
      tag.formTag.length > 0 &&
      tag.formTag[0] !== '.' &&
      tag.formTag[0] !== 'X'
    ) {
      categories.degree = degreeMapping[tag.formTag[0]] || null;
    }
  } else if (pos === 'C') {
    // Злучнік
    if (
      tag.paradigmTag.length > 1 &&
      tag.paradigmTag[1] !== '.' &&
      tag.paradigmTag[1] !== 'X'
    ) {
      const conjunctionTypeMap: Record<string, string> = {
        S: 'падпарадкавальны',
        K: 'злучальны',
      };
      categories.conjunctionType =
        conjunctionTypeMap[tag.paradigmTag[1]] || null;
    }
  }

  return categories;
}
