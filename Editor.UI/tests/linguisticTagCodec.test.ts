import {
  buildTag,
  categoryOptions,
  manualCategoryKeys,
  parseTagCodes,
} from '@/app/docs/linguisticCategories';
import { LinguisticTag } from '@/app/docs/types';

describe('parseTagCodes', () => {
  test('назоўнік: коды парадыгмы і формы', () => {
    expect(parseTagCodes({ paradigmTag: 'NPA....', formTag: 'NS' })).toEqual({
      partOfSpeech: 'N',
      properName: 'P',
      animacy: 'A',
      case: 'N',
      number: 'S',
    });
  });

  test('назоўнік: форма з трох сымбаляў дае род формы, а не род парадыгмы', () => {
    const codes = parseTagCodes({ paradigmTag: 'N......', formTag: 'MNS' });
    expect(codes.formGender).toBe('M');
    expect(codes.gender).toBeUndefined();
    expect(codes.case).toBe('N');
    expect(codes.number).toBe('S');
  });

  test('назоўнік: род парадыгмы і род формы захоўваюцца асобна', () => {
    const codes = parseTagCodes({ paradigmTag: 'NCIP.C1', formTag: 'MNS' });
    expect(codes.gender).toBe('C');
    expect(codes.formGender).toBe('M');
  });

  test('пусты тэг', () => {
    expect(parseTagCodes({ paradigmTag: '', formTag: null })).toEqual({});
    expect(parseTagCodes({ paradigmTag: 'X', formTag: null })).toEqual({});
  });

  test('дзеяслоў: дзеепрыслоўе і загадны лад', () => {
    const gerund = parseTagCodes({ paradigmTag: 'VPMN1..', formTag: 'RG' });
    expect(gerund.verbTense).toBe('R');
    expect(gerund.verbMood).toBe('G');

    const imperative = parseTagCodes({
      paradigmTag: 'VPMN1..',
      formTag: 'I2S',
    });
    expect(imperative.verbTense).toBe('I');
    expect(imperative.person).toBe('2');
    expect(imperative.number).toBe('S');
  });

  test('дзеепрыметнік: кароткая форма распазнаецца незалежна ад даўжыні тэгу', () => {
    const codes = parseTagCodes({ paradigmTag: 'PARP', formTag: 'RMS' });
    expect(codes.participleForm).toBe('R');
    expect(codes.gender).toBeUndefined();
  });
});

// Тэгі, якія ручны ўвод мусіць умець сабраць назад
const roundTripTags: LinguisticTag[] = [
  { paradigmTag: 'NPA....', formTag: 'NS' },
  { paradigmTag: 'NCI..M1', formTag: 'GP' },
  { paradigmTag: 'NCIP.C1', formTag: 'MNS' },
  { paradigmTag: 'NCIP.S5', formTag: 'FGS' },
  { paradigmTag: 'AQP', formTag: 'MNS' },
  { paradigmTag: 'AQP', formTag: 'R' },
  { paradigmTag: 'MNC', formTag: 'MNS' },
  { paradigmTag: 'MNC', formTag: '0' },
  { paradigmTag: 'SNP1', formTag: 'MNS' },
  { paradigmTag: 'VTMN1', formTag: 'R1S' },
  { paradigmTag: 'VTMN1', formTag: 'F3P' },
  { paradigmTag: 'VTMN1', formTag: '0' },
  { paradigmTag: 'VTMN1', formTag: 'I2S' },
  { paradigmTag: 'VTMN1', formTag: 'PMS' },
  { paradigmTag: 'VTMN1', formTag: 'RG' },
  { paradigmTag: 'PARP', formTag: 'MNS' },
  { paradigmTag: 'PARP', formTag: 'R' },
  { paradigmTag: 'RA', formTag: 'P' },
  { paradigmTag: 'CS', formTag: null },
];

describe('buildTag(parseTagCodes(tag)) вяртае той самы тэг', () => {
  test.each(roundTripTags)('%j', tag => {
    const codes = parseTagCodes(tag);
    const rebuilt = buildTag(codes.partOfSpeech!, codes);

    expect(rebuilt.formTag).toBe(tag.formTag);
    // Незапоўненыя пазыцыі парадыгмы зьвяраем без хвастовых кропак
    expect(rebuilt.paradigmTag.replace(/\.+$/, '')).toBe(
      tag.paradigmTag.replace(/\.+$/, '')
    );
  });
});

describe('ручны ўвод', () => {
  test('катэгорыі назоўніка ідуць у парадку тэгу', () => {
    expect(manualCategoryKeys('N')).toEqual([
      'properName',
      'animacy',
      'personhood',
      'abbreviation',
      'gender',
      'declension',
      'formGender',
      'case',
      'number',
    ]);
  });

  test('дапушчальныя коды залежаць ад часьціны мовы', () => {
    const verbGenders = categoryOptions('V', 'gender').map(o => o.value);
    const nounGenders = categoryOptions('N', 'gender').map(o => o.value);

    expect(verbGenders).toEqual(['M', 'F', 'N']);
    expect(nounGenders).toContain('U');
    // Клічны склон ёсьць толькі ў назоўніка
    expect(categoryOptions('N', 'case').map(o => o.value)).toContain('V');
    expect(categoryOptions('A', 'case').map(o => o.value)).not.toContain('V');
  });

  test('дзеепрыметнік мае толькі цяперашні і прошлы час', () => {
    expect(categoryOptions('P', 'verbTense').map(o => o.value)).toEqual([
      'R',
      'P',
    ]);
    // У дзеяслова застаюцца ўсе часы, разам з загадным ладам і інфінітывам
    expect(categoryOptions('V', 'verbTense').map(o => o.value)).toContain('0');
  });

  test('код роду «P» подпісваецца паводле часьціны мовы', () => {
    const label = (pos: string, key: 'gender' | 'formGender') =>
      categoryOptions(pos, key).find(o => o.value === 'P')?.label;

    expect(label('N', 'gender')).toBe('толькі множны лік');
    expect(label('N', 'formGender')).toBe('адсутнасьць роду ў множным ліку');
    expect(label('M', 'gender')).toBe('адсутны');
    // Без адхіленьня застаецца базавы подпіс
    expect(label('A', 'gender')).toBe('множны лік');
    expect(label('P', 'gender')).toBe('множны лік');
  });

  test('займеньнік можа быць нязьменным', () => {
    // GrammarDB мае парадыгмы кшталту S0S0 - код «0» тут дапушчальны
    expect(categoryOptions('S', 'inflectionType').map(o => o.value)).toContain(
      '0'
    );
  });

  test('без часьціны мовы тэг пусты', () => {
    expect(buildTag('', {})).toEqual({ paradigmTag: '', formTag: null });
  });
});
