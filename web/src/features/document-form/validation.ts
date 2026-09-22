/**
 * Проверка полей документа.
 *
 * Правила берутся из описания шаблона, а не пишутся под каждый приказ:
 * «дата возвращения не раньше даты выезда» — это свойство приказа о
 * командировке, и оно записано в `dateLimits` поля.
 *
 * Проверка идёт дважды: орган ввода получает `min` и `max`, а сохранение
 * прогоняет тот же список ещё раз. Ограничение в `<input type="date">`
 * не мешает вписать дату руками или вставить её из буфера, поэтому одного
 * атрибута мало.
 */
import { t } from '@/i18n';
import { formatDocumentDate } from '@/utils/format';

import type { FieldDef } from '@/api/types';

export interface FieldProblem {
  fieldId: string;
  message: string;
}

/** Сегодняшний день в том же виде, в каком его отдаёт `<input type="date">`. */
export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Границы для органа ввода: браузер не даст выбрать дату вне них. */
export function dateBounds(
  def: FieldDef,
  values: Record<string, string>,
): { min?: string; max?: string } {
  const limits = def.dateLimits;
  if (limits === undefined) return {};

  const mins: string[] = [];
  if (limits.notBefore === 'today') mins.push(today());
  if (limits.afterField !== undefined) {
    const other = values[limits.afterField] ?? '';
    if (other !== '') mins.push(other);
  }

  const min = mins.sort().at(-1);
  const max = limits.notAfter === 'today' ? today() : undefined;

  return {
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
  };
}

/**
 * Проверяет одно поле. Пустое необязательное поле ошибкой не является.
 *
 * Возвращается первая найденная причина: показывать под полем список
 * претензий незачем, человек всё равно чинит их по одной.
 */
export function checkField(
  def: FieldDef,
  values: Record<string, string>,
  fields: FieldDef[],
): string | null {
  const value = (values[def.id] ?? '').trim();

  if (value === '') {
    return def.required ? t.form.required : null;
  }

  const limits = def.dateLimits;
  if (def.kind !== 'date' || limits === undefined) return null;

  if (limits.notBefore === 'today' && value < today()) {
    return t.form.dateNotBefore;
  }

  if (limits.notAfter === 'today' && value > today()) {
    return t.form.dateNotAfter;
  }

  if (limits.afterField !== undefined) {
    const other = (values[limits.afterField] ?? '').trim();
    if (other !== '' && value < other) {
      const label = fields.find((f) => f.id === limits.afterField)?.label ?? limits.afterField;
      return `${t.form.dateAfter} «${label}» (${formatDocumentDate(other)})`;
    }
  }

  return null;
}

/** Все замечания по форме, в порядке полей: первое из них получает фокус. */
export function validateFields(
  fields: FieldDef[],
  values: Record<string, string>,
): FieldProblem[] {
  const problems: FieldProblem[] = [];

  for (const def of fields) {
    const message = checkField(def, values, fields);
    if (message !== null) problems.push({ fieldId: def.id, message });
  }

  return problems;
}
