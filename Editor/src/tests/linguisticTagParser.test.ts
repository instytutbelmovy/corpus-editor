import { parseLinguisticTag } from '../types/linguisticCategories';

describe('parseLinguisticTag', () => {
  test('разбор назоўніка', () => {
    const tag = { paradigmTag: 'NPA....', formTag: 'NS' };
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBe('назоўнік');
    expect(categories.properName).toBe('уласны'); // P = уласны, C = агульны
    expect(categories.animacy).toBe('адушаўлёны');
    expect(categories.case).toBe('назоўны');
    expect(categories.number).toBe('адзіночны');
  });

  test('разбор прыметніка', () => {
    const tag = { paradigmTag: 'AQP....', formTag: 'MNS' };
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBe('прыметнік');
    expect(categories.adjectiveType).toBe('якасны');
    expect(categories.degree).toBe('станоўчая');
    expect(categories.gender).toBe('мужчынскі');
    expect(categories.case).toBe('назоўны');
    expect(categories.number).toBe('адзіночны');
  });

  test('разбор дзеяслова', () => {
    const tag = { paradigmTag: 'VTMN1..', formTag: 'R1S' }; // T = пераходны, P = пераходны/непераходны
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBe('дзеяслоў');
    expect(categories.verbTransitivity).toBe('пераходны');
    expect(categories.verbAspect).toBe('незакончанае');
    expect(categories.verbReflexivity).toBe('незваротны');
    expect(categories.verbConjugation).toBe('першае');
    expect(categories.verbTense).toBe('цяперашні');
    expect(categories.person).toBe('першая');
    expect(categories.number).toBe('адзіночны');
  });

  test('разбор лічэбніка', () => {
    const tag = { paradigmTag: 'MNCS...', formTag: 'MNS' }; // S = просты, C = складаны
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBe('лічэбнік');
    expect(categories.inflectionType).toBe('як у назоўніка');
    expect(categories.numeralType).toBe('колькасны');
    expect(categories.numeralStructure).toBe('просты');
    expect(categories.gender).toBe('мужчынскі');
    expect(categories.case).toBe('назоўны');
    expect(categories.number).toBe('адзіночны');
  });

  test('разбор займеньніка', () => {
    const tag = { paradigmTag: 'SNP1...', formTag: 'MNS' };
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBe('займеньнік');
    expect(categories.inflectionType).toBe('як у назоўніка');
    expect(categories.pronounType).toBe('асабовы');
    expect(categories.person).toBe('першая');
    expect(categories.gender).toBe('мужчынскі');
    expect(categories.case).toBe('назоўны');
    expect(categories.number).toBe('адзіночны');
  });

  test('разбор дзеепрыметніка', () => {
    const tag = { paradigmTag: 'PARP...', formTag: 'MNS' }; // A = незалежны, P = залежны
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBe('дзеепрыметнік');
    expect(categories.participleType).toBe('незалежны');
    expect(categories.verbTense).toBe('цяперашні');
    expect(categories.verbAspect).toBe('закончанае');
    expect(categories.gender).toBe('мужчынскі');
    expect(categories.case).toBe('назоўны');
    expect(categories.number).toBe('адзіночны');
  });

  test('разбор прыслоўя', () => {
    const tag = { paradigmTag: 'RA....', formTag: 'P' };
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBe('прыслоўе');
    expect(categories.adverbOrigin).toBe('ад прыметнікаў');
    expect(categories.degree).toBe('станоўчая');
  });

  test('разбор злучніка', () => {
    const tag = { paradigmTag: 'CS....', formTag: null };
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBe('злучнік');
    expect(categories.conjunctionType).toBe('падпарадкавальны');
  });

  test('пусты тэг', () => {
    const tag = { paradigmTag: '', formTag: null };
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBeNull();
    expect(categories.gender).toBeNull();
    expect(categories.case).toBeNull();
  });

  test('тэг з адсутнымі значэньнямі', () => {
    const tag = { paradigmTag: 'N.....', formTag: '..' };
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBe('назоўнік');
    expect(categories.properName).toBeNull();
    expect(categories.animacy).toBeNull();
  });

  test('дзеяслоў у інфінітыве', () => {
    const tag = { paradigmTag: 'VPMN1..', formTag: '0' };
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBe('дзеяслоў');
    expect(categories.verbTense).toBe('інфінітыў');
  });

  test('дзеепрыслоўе', () => {
    const tag = { paradigmTag: 'VPMN1..', formTag: 'RG' };
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBe('дзеяслоў');
    expect(categories.verbTense).toBe('цяперашні');
    expect(categories.verbMood).toBe('дзеепрыслоўе');
  });

  test('прыметнік у функцыі прыслоўя', () => {
    const tag = { paradigmTag: 'AQP....', formTag: 'R' };
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBe('прыметнік');
    expect(categories.adverbFunction).toBe('у функцыі прыслоўя');
  });

  test('лічэбнік нескланяльны', () => {
    const tag = { paradigmTag: 'MNC....', formTag: '0' };
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBe('лічэбнік');
    expect(categories.numeralInflection).toBe('нескланяльны');
  });

  test('дзеепрыметнік кароткая форма', () => {
    const tag = { paradigmTag: 'PRP....', formTag: 'R' };
    const categories = parseLinguisticTag(tag);

    expect(categories.partOfSpeech).toBe('дзеепрыметнік');
    expect(categories.participleForm).toBe('кароткая форма');
  });
});
