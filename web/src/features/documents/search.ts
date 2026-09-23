/**
 * Поиск по реестру документов.
 *
 * Ищется по всему, что человек видит в строке реестра: номер, название,
 * «для кого», описание, состояние, кто заполнил, дата создания и изменения
 * («Тест день 2»). Несколько слов сужают поиск: «приказ отпуск Ахметов»
 * найдёт документ, где встретились все три.
 *
 * Поиск идёт по списку, который политика уже отобрала для человека
 * (`visibleDocuments`), поэтому найти чужой документ им нельзя. На сервере
 * он уйдёт в SQL-запрос с тем же фильтром доступа (CLAUDE.md, п. 3.2).
 */
import { en } from '@/i18n/en';
import { ru } from '@/i18n/ru';
import { contentEn } from '@/i18n/content-en';
import { formatDateTime, formatShortDate } from '@/utils/format';

import type { DocumentRecord } from '@/api/types';

/** Строка для сравнения: без регистра, «ё» как «е», пробелы схлопнуты. */
function fold(text: string): string {
  return text.toLocaleLowerCase('ru').replace(/ё/gu, 'е').replace(/\s+/gu, ' ');
}

/**
 * Всё, по чему документ находится.
 *
 * Состояние и название ищутся на обоих языках интерфейса: человек, который
 * переключился на английский, всё равно может набрать «черновик».
 */
function haystack(doc: DocumentRecord): string {
  return fold(
    [
      doc.number ?? '',
      doc.title,
      contentEn[doc.title] ?? '',
      doc.subject,
      doc.description,
      doc.authorName,
      ru.status[doc.status],
      en.status[doc.status],
      formatShortDate(doc.createdAt),
      formatDateTime(doc.createdAt),
      formatDateTime(doc.updatedAt),
    ].join('\n'),
  );
}

/** Документы, в которых встретились все слова запроса. Пустой запрос – все. */
export function searchDocuments(documents: DocumentRecord[], query: string): DocumentRecord[] {
  const words = fold(query).trim().split(' ').filter(Boolean);
  if (words.length === 0) return documents;

  return documents.filter((doc) => {
    const text = haystack(doc);
    return words.every((word) => text.includes(word));
  });
}
