/**
 * Поиск по словам: общий для реестра документов, архива и админ-панели.
 *
 * Запрос делится на слова, и запись подходит, если в ней встретились все
 * слова: «приказ отпуск Ахметов» сужает, а не расширяет выдачу.
 *
 * Имя человек набирает так, как помнит («Тест день 3»): по-русски, с
 * казахскими буквами или латиницей. Поэтому слово ищется дважды – в тексте,
 * где казахские буквы сведены к русским («Нұрлан» = «Нурлан»), и в том же
 * тексте латиницей по тем же правилам, по которым имя пишется на английском
 * экране («Нурлан» = «Nurlan»).
 */
import { russianLetters, transliterate } from './names';

/** Строка для сравнения: без регистра, «ё» как «е», казахские буквы как русские. */
export function fold(text: string): string {
  return russianLetters(text.toLocaleLowerCase('ru')).replace(/ё/gu, 'е').replace(/\s+/gu, ' ');
}

/** Встретились ли все слова запроса хотя бы в одном из полей. Пустой запрос – да. */
export function matchesQuery(query: string, fields: Array<string | null | undefined>): boolean {
  const words = fold(query).trim().split(' ').filter(Boolean);
  if (words.length === 0) return true;

  const text = fold(fields.filter((f): f is string => typeof f === 'string').join('\n'));
  const latin = transliterate(text);
  return words.every((word) => text.includes(word) || latin.includes(transliterate(word)));
}
