/**
 * Поле формы.
 *
 * Орган ввода выбирается по типу поля из шаблона: форма строится из описания
 * документа, а не пишется руками под каждый приказ (CLAUDE.md, п. 6). Когда
 * поля начнут приходить из fields.yaml с сервера, этот компонент не изменится.
 */
import { useId } from 'react';

import { counterparties } from '@/api/mock/directory';
import { t } from '@/i18n';
import { formatMoney } from '@/utils/format';

import styles from './Field.module.css';

import type { EmployeeBrief, FieldDef } from '@/api/types';

interface Props {
  def: FieldDef;
  value: string;
  /** Что именно не так с полем. Пусто — поле в порядке. */
  problem?: string | null;
  /** Работники этой компании. Список другой компании сюда не попадает. */
  employees?: EmployeeBrief[];
  /** Границы для дат, посчитанные по `dateLimits` и соседним полям. */
  bounds?: { min?: string; max?: string };
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export function Field({
  def,
  value,
  problem = null,
  employees = [],
  bounds = {},
  onChange,
  onFocus,
  onBlur,
}: Props) {
  const id = `field-${def.id}`;
  const listId = useId();
  const hintId = def.hint === undefined ? undefined : `${id}-hint`;
  const errorId = problem === null ? undefined : `${id}-error`;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  // ФИО вписано руками, а не выбрано из справочника: в документ оно попадёт
  // как есть, без родительного падежа. Человек должен это видеть.
  const manualName =
    def.kind === 'employee' && value !== '' && !employees.some((e) => e.id === value);

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {def.label}
        {def.required ? (
          <span className={styles.required} title={t.form.required}>
            {' '}
            *
          </span>
        ) : null}
      </label>

      <div className={styles.control}>
        {renderControl({
          def,
          id,
          listId,
          value,
          invalid: problem !== null,
          describedBy,
          employees,
          bounds,
          onChange,
          onFocus,
          onBlur,
        })}
        {def.unit === undefined ? null : <span className={styles.unit}>{def.unit}</span>}
      </div>

      {def.hint === undefined ? null : (
        <p className={styles.hint} id={hintId}>
          {def.hint}
        </p>
      )}

      {manualName ? <p className={styles.note}>{t.form.employeeManualNote}</p> : null}

      {problem === null ? null : (
        <p className={styles.error} id={errorId} role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}

interface ControlProps {
  def: FieldDef;
  id: string;
  listId: string;
  value: string;
  invalid: boolean;
  describedBy: string | undefined;
  employees: EmployeeBrief[];
  bounds: { min?: string; max?: string };
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

function renderControl({
  def,
  id,
  listId,
  value,
  invalid,
  describedBy,
  employees,
  bounds,
  onChange,
  onFocus,
  onBlur,
}: ControlProps) {
  const className = invalid ? `${styles.input} ${styles.inputInvalid}` : styles.input;
  const common = {
    id,
    onFocus,
    onBlur,
    'aria-describedby': describedBy,
    'aria-invalid': invalid,
  };

  switch (def.kind) {
    case 'textarea':
      return (
        <textarea
          {...common}
          className={`${className} ${styles.textarea}`}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'date':
      return (
        <input
          {...common}
          className={className}
          type="date"
          value={value}
          // Границы не дают выбрать дату мышью, но дату можно вписать руками
          // или вставить из буфера — поэтому те же правила ещё раз проверяются
          // при сохранении (см. features/document-form/validation.ts).
          {...(bounds.min === undefined ? {} : { min: bounds.min })}
          {...(bounds.max === undefined ? {} : { max: bounds.max })}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'money':
      // Деньги вводятся и хранятся строкой: числа с плавающей точкой для
      // денег запрещены, и на сайте их нет даже временно (CLAUDE.md, п. 3.9).
      return (
        <input
          {...common}
          className={`${className} tabular`}
          type="text"
          inputMode="numeric"
          value={formatMoney(value)}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        />
      );

    case 'number':
      return (
        <input
          {...common}
          className={`${className} tabular`}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        />
      );

    case 'employee': {
      // Не список выбора, а поле с подсказкой: работника берут из справочника
      // компании, но нового человека можно вписать руками, не заводя карточку.
      // Значение из справочника хранится идентификатором, вписанное вручную —
      // самим текстом; лист документа различает их по совпадению с карточкой.
      const selected = employees.find((e) => e.id === value);

      return (
        <>
          <input
            {...common}
            className={className}
            type="text"
            list={listId}
            value={selected === undefined ? value : selected.fullName}
            placeholder={employees.length === 0 ? t.form.noEmployees : t.form.selectEmployee}
            onChange={(e) => {
              const typed = e.target.value;
              const match = employees.find((emp) => emp.fullName === typed);
              onChange(match === undefined ? typed : match.id);
            }}
          />
          <datalist id={listId}>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.fullName}>
                {employee.position}
              </option>
            ))}
          </datalist>
        </>
      );
    }

    case 'counterparty':
      return (
        <select
          {...common}
          className={`${className} ${styles.select}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{t.form.selectCounterparty}</option>
          {counterparties.map((counterparty) => (
            <option key={counterparty.id} value={counterparty.id}>
              {counterparty.name}
            </option>
          ))}
        </select>
      );

    case 'select':
      return (
        <select
          {...common}
          className={`${className} ${styles.select}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{t.form.selectOption}</option>
          {(def.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case 'text':
    default:
      return (
        <input
          {...common}
          className={className}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
