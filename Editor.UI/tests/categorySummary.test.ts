import { summarizeTag, summarizeTagDiff } from '@/app/grammar/categorySummary';

describe('summarizeTag', () => {
  test("вобласьць 'all': часьціна мовы, катэгорыі парадыгмы і формы", () => {
    const summary = summarizeTag({ paradigmTag: 'NCIP.M1', formTag: 'NS' });

    expect(summary).toBe(
      'назоўнік, агульны, неадушаўлёны, асабовы, мужчынскі, 1 скланеньне, назоўны, адзіночны'
    );
  });

  test("вобласьць 'form': толькі катэгорыі словаформы", () => {
    const summary = summarizeTag(
      { paradigmTag: 'NCIP.M1', formTag: 'NS' },
      'form'
    );

    expect(summary).toBe('назоўны, адзіночны');
  });

  test('тэг парадыгмы без формы', () => {
    const summary = summarizeTag({ paradigmTag: 'CS....', formTag: null });

    expect(summary).toBe('злучнік, падпарадкавальны');
  });

  test("нязьменная частка мовы ў вобласьці 'form' дае пусты радок", () => {
    expect(summarizeTag({ paradigmTag: 'CS....', formTag: null }, 'form')).toBe(
      ''
    );
  });
});

describe('summarizeTagDiff', () => {
  test('аднолькавыя тэгі - пусты радок', () => {
    expect(summarizeTagDiff('NCIP.M1', 'NCIP.M1')).toBe('');
  });

  test('розныя тэгі - толькі тое, што адрозьніваецца', () => {
    expect(summarizeTagDiff('NCIP.M1', 'NCIP.N2')).toBe('ніякі, 2 скланеньне');
  });

  test('катэгорыя, якой у варыянце няма, не паказваецца', () => {
    expect(summarizeTagDiff('NCIP.M1', 'NCIP..1')).toBe('');
  });
});
