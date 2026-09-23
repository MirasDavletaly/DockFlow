/**
 * Поиск по словам: общий для реестра документов и админ-панели.
 *
 * Запрос делится на слова, и запись подходит, если в ней встретились все
 * слова: «приказ отпуск Ахметов» сужает, а не расширяет выдачу.
 */

/** Строка для сравнения: без регистра, «ё» как «е», пробелы схлопнуты. */
export function fold(text: string): string {
  return text.toLocaleLowerCase('ru').replace(/ё/gu, 'е').replace(/\s+/gu, ' ');
}

/** Встретились ли все слова запроса хотя бы в одном из полей. Пустой запрос – да. */
export function matchesQuery(query: string, fields: Array<string | null | undefined>): boolean {
  const words = fold(query).trim().split(' ').filter(Boolean);
  if (words.length === 0) return true;

  const text = fold(fields.filter((f): f is string => typeof f === 'string').join('\n'));
  return words.every((word) => text.includes(word));
}
