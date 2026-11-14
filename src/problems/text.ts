/** Tiny wording helpers for narration templates (counts of 1 get the singular). */

/** plural(1, 'way') -> "1 way"; plural(2, 'way') -> "2 ways"; plural(2, 'child', 'children') -> "2 children". */
export const plural = (n: number, singular: string, pluralForm?: string): string =>
  `${n} ${n === 1 ? singular : (pluralForm ?? singular + 's')}`;

/** Just the noun: noun(1, 'way') -> "way", noun(0, 'way') -> "ways" (for "${n} other ${noun(n, 'way')}"). */
export const noun = (n: number, singular: string, pluralForm?: string): string => (n === 1 ? singular : (pluralForm ?? singular + 's'));

/** verb(1, 'is', 'are') -> "is"; verb(2, 'is', 'are') -> "are". */
export const verb = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/** ordinal(1) -> "1st", ordinal(2) -> "2nd", ordinal(3) -> "3rd", ordinal(11) -> "11th", ordinal(21) -> "21st". */
export const ordinal = (n: number): string => {
  const m100 = Math.abs(n) % 100;
  const m10 = Math.abs(n) % 10;
  const suffix = m100 >= 11 && m100 <= 13 ? 'th' : m10 === 1 ? 'st' : m10 === 2 ? 'nd' : m10 === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
};

/** "a" or "an" before a number word, e.g. a(8) -> "an 8", a(5) -> "a 5". */
export const aNum = (n: number): string => (/^(8|11|18|8\d)/.test(String(n)) ? `an ${n}` : `a ${n}`);
