import { findPrefixMatch } from '@/app/grammar/normalize';

describe('findPrefixMatch', () => {
  test('простае супадзеньне без асаблівасьцяў', () => {
    expect(findPrefixMatch('хата', 'хат')).toEqual({ start: 0, end: 3 });
  });

  test('нячулае да рэгістру', () => {
    expect(findPrefixMatch('Хата', 'хат')).toEqual({ start: 0, end: 3 });
  });

  test('націск у леме ня зьбівае пазыцыі і трапляе ў супадзеньне', () => {
    // 'ха́та' - літара + U+0301 + "та"
    const text = 'ха́та';
    expect(findPrefixMatch(text, 'хат')).toEqual({ start: 0, end: 4 });
  });

  test('запыт з тыпаграфічным + замест націску супадае з нармальным націскам', () => {
    expect(findPrefixMatch('ха́та', 'ха+т')).toEqual({
      start: 0,
      end: 4,
    });
  });

  test('ў у тэксьце прыраўноўваецца да у ў запыце', () => {
    expect(findPrefixMatch('ўзгорак', 'узгор')).toEqual({ start: 0, end: 5 });
  });

  test('лацінскае i у запыце супадае з беларускім і', () => {
    // Нармалізатар мяняе толькі літару i/I (частая блытаніна раскладак), а не поўную транслітэрацыю
    expect(findPrefixMatch('іголка', 'iгол')).toEqual({ start: 0, end: 4 });
  });

  test('падрадковае, але не прэфікснае супадзеньне не лічыцца', () => {
    expect(findPrefixMatch('вадаправод', 'права')).toBeNull();
  });

  test('пусты запыт нічога не падсьвятляе', () => {
    expect(findPrefixMatch('хата', '')).toBeNull();
  });

  test('запыт даўжэйшы за тэкст не супадае', () => {
    expect(findPrefixMatch('хат', 'хата')).toBeNull();
  });
});
