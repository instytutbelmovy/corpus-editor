// Памылкі формы па назвах палёў; ключ `submit` — памылка адпраўкі цалкам.
// Без парамэтра ключы адвольныя (формы дакумэнта), з парамэтрам — толькі свае палі.
export type FormErrors<K extends string = string> = Partial<
  Record<K | 'submit', string>
>;
