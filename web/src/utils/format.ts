/**
 * Приведение значений к виду, принятому в документах.
 *
 * Деньги и даты в документе имеют юридические последствия, поэтому
 * форматирование собрано в одном месте, а не повторяется по экранам.
 */

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
] as const;

/** Дата в документе: «21 сентября 2026 г.» */
export function formatDocumentDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const month = MONTHS_GENITIVE[date.getMonth()] ?? '';
  return `${date.getDate()} ${month} ${date.getFullYear()} г.`;
}

/** Дата в списках: «21.09.2026» */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

/**
 * Сумма с разделением разрядов неразрывным пробелом: «450 000».
 *
 * Значение приходит строкой и строкой же остаётся: числа с плавающей точкой
 * для денег запрещены (CLAUDE.md, п. 3.9), и сайт их не вводит даже временно.
 */
export function formatMoney(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
}

/** Время суток для приветствия на рабочем столе. */
export function partOfDay(now: Date = new Date()): 'morning' | 'day' | 'evening' {
  const h = now.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'day';
  return 'evening';
}
