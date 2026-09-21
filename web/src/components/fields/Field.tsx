/**
 * Поле формы.
 *
 * Орган ввода выбирается по типу поля из шаблона: форма строится из описания
 * документа, а не пишется руками под каждый приказ (CLAUDE.md, п. 6). Когда
 * поля начнут приходить из fields.yaml с сервера, этот компонент не изменится.
 */
import { counterparties, employees } from '@/api/mock/directory';
import { t } from '@/i18n';
import { formatMoney } from '@/utils/format';

import styles from './Field.module.css';

import type { FieldDef } from '@/api/types';

interface Props {
  def: FieldDef;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export function Field({ def, value, invalid, onChange, onFocus, onBlur }: Props) {
  const id = `field-${def.id}`;
  const describedBy = def.hint === undefined ? undefined : `${id}-hint`;

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
        {renderControl({ def, id, value, invalid, describedBy, onChange, onFocus, onBlur })}
        {def.unit === undefined ? null : <span className={styles.unit}>{def.unit}</span>}
      </div>

      {def.hint === undefined ? null : (
        <p className={styles.hint} id={describedBy}>
          {def.hint}
        </p>
      )}

      {invalid ? (
        <p className={styles.error} role="alert">
          {t.form.required}
        </p>
      ) : null}
    </div>
  );
}

interface ControlProps extends Props {
  id: string;
  describedBy: string | undefined;
}

function renderControl({
  def,
  id,
  value,
  invalid,
  describedBy,
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

    case 'employee':
      return (
        <select
          {...common}
          className={`${className} ${styles.select}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{t.form.selectEmployee}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.fullName} — {employee.position}
            </option>
          ))}
        </select>
      );

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
