/**
 * Лист документа.
 *
 * Это главный предмет на экране: человек заполняет форму и сразу видит
 * настоящий лист А4, а не «предпросмотр» за отдельной кнопкой. Ошибка в
 * утверждённом документе имеет юридические последствия, поэтому видеть
 * результат нужно до сохранения, а не после.
 *
 * Тот же компонент печатается: класс .print-root оставляет на бумаге только
 * лист (см. styles/print.css).
 */
import { findCounterparty, findEmployee } from '@/api/mock/directory';
import { t } from '@/i18n';
import { formatDocumentDate, formatMoney } from '@/utils/format';

import styles from './DocumentSheet.module.css';

import type { Company, DocBlock, DocumentTemplate, FieldDef, Run } from '@/api/types';

interface Props {
  template: DocumentTemplate;
  values: Record<string, string>;
  company: Company;
  /** Дата документа. */
  date: string;
  /**
   * Номер документа. Вводится вручную при заполнении и может отсутствовать:
   * тогда в листе стоит прочерк, как на неподписанном бланке.
   */
  number?: string | null;
  /** Ставить ли водяной знак «Черновик». */
  draft?: boolean;
  /** Поле, на котором сейчас стоит курсор в форме: подсвечивается в листе. */
  activeFieldId?: string | null;
}

export function DocumentSheet({
  template,
  values,
  company,
  date,
  number = null,
  draft = false,
  activeFieldId = null,
}: Props) {
  const fieldsById = new Map<string, FieldDef>(template.fields.map((f) => [f.id, f]));

  function renderRuns(runs: Run[], keyPrefix: string) {
    return runs.map((run, index) => {
      const key = `${keyPrefix}-${index}`;

      if ('text' in run) {
        return <span key={key}>{run.text}</span>;
      }

      const resolved = resolveField(run.field, values, company, fieldsById);
      const isActive = activeFieldId !== null && run.field === activeFieldId;

      if (resolved === '') {
        // Пропуск рисуется шириной в CSS, а не повторёнными пробелами:
        // невидимые символы в исходнике не видно при правке, и ширина
        // пропуска скакала бы вслед за шрифтом.
        return (
          <span
            key={key}
            className={isActive ? `${styles.blank} ${styles.blankActive}` : styles.blank}
            aria-label={t.form.emptyPlaceholder}
          />
        );
      }

      return (
        <span key={key} className={isActive ? styles.valueActive : styles.value}>
          {resolved}
        </span>
      );
    });
  }

  function renderBlock(block: DocBlock, index: number) {
    const key = `b-${index}`;

    switch (block.kind) {
      case 'company-header': {
        // Шапка бланка: индекс с адресом одной строкой, реквизиты — следующей.
        // Незаполненные реквизиты не печатаются вовсе: разделитель без значения
        // на бумаге читается как потерянный реквизит.
        const addressLine = [company.postalCode, company.address].filter(isFilled).join(', ');
        const requisites = [`БИН ${company.bin}`, company.phone, company.email].filter(isFilled);

        return (
          <header key={key} className={styles.header}>
            <div className={styles.headerMark} aria-hidden="true">
              {company.monogram}
            </div>
            <div className={styles.headerText}>
              <div className={styles.headerName}>{company.legalName}</div>
              <div className={styles.headerLine}>{addressLine}</div>
              <div className={styles.headerLine}>{requisites.join(' · ')}</div>
            </div>
          </header>
        );
      }

      case 'doc-number': {
        // Номер вводится вручную в группе «Регистрация», поэтому он тоже
        // подсвечивается, когда курсор стоит в своём поле.
        const numberActive = activeFieldId === '@number';
        const numberClass = [
          number === null ? styles.numberBlank : styles.numberValue,
          numberActive ? styles.numberHighlight : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={key} className={styles.numberRow}>
            <span className={styles.numberCell}>
              №&nbsp;
              <span className={numberClass}>{number ?? t.sheet.numberPlaceholder}</span>
            </span>
            <span className={styles.numberCell}>от {formatDocumentDate(date)}</span>
          </div>
        );
      }

      case 'title':
        return (
          <h1 key={key} className={styles.title}>
            {block.text}
          </h1>
        );

      case 'subtitle':
        return (
          <p key={key} className={styles.subtitle}>
            {renderRuns(block.runs, key)}
          </p>
        );

      case 'preamble':
        return (
          <p key={key} className={styles.preamble}>
            {renderRuns(block.runs, key)}
          </p>
        );

      case 'paragraph':
        return (
          <p key={key} className={styles.paragraph}>
            {renderRuns(block.runs, key)}
          </p>
        );

      case 'order-word':
        return (
          <p key={key} className={styles.orderWord}>
            {block.text}
          </p>
        );

      case 'numbered':
        return (
          <ol key={key} className={styles.numbered}>
            {block.items.map((item, i) => (
              <li key={`${key}-${i}`}>{renderRuns(item, `${key}-${i}`)}</li>
            ))}
          </ol>
        );

      case 'basis':
        return (
          <p key={key} className={styles.basis}>
            <span className={styles.basisLabel}>{t.sheet.basisTitle} </span>
            {renderRuns(block.runs, key)}
            <span>.</span>
          </p>
        );

      case 'signature':
        return (
          <div key={key} className={styles.signature}>
            <span className={styles.signatureRole}>{company.directorTitle}</span>
            <span className={styles.signatureLine} aria-hidden="true" />
            <span className={styles.signatureName}>{company.directorName}</span>
          </div>
        );

      case 'acquaint':
        return (
          <div key={key} className={styles.acquaint}>
            <div className={styles.acquaintTitle}>{t.sheet.acquaintTitle}</div>
            <div className={styles.acquaintRow}>
              <span className={styles.acquaintLine} aria-hidden="true" />
              <span className={styles.acquaintHint}>{t.sheet.signatureName}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <article className={styles.sheet} lang="ru">
      {draft ? (
        <div className={styles.watermark} aria-hidden="true">
          {t.sheet.watermark}
        </div>
      ) : null}
      <div className={styles.content}>{template.body.map(renderBlock)}</div>
    </article>
  );
}

/** Реквизит заполнен: необязательные поля компании приходят и пустыми. */
function isFilled(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '';
}

/**
 * Подставляет значение поля в текст документа.
 *
 * Поля, начинающиеся с «@», берутся из реквизитов компании: их человек не
 * вводит, и подменить их через форму нельзя.
 */
function resolveField(
  fieldId: string,
  values: Record<string, string>,
  company: Company,
  fieldsById: Map<string, FieldDef>,
): string {
  if (fieldId.startsWith('@company.')) {
    const key = fieldId.slice('@company.'.length) as keyof Company;
    const value = company[key];
    return typeof value === 'string' ? value : '';
  }

  const raw = values[fieldId];
  if (raw === undefined || raw === '') return '';

  const def = fieldsById.get(fieldId);
  switch (def?.kind) {
    case 'employee':
      // В приказах работник стоит в родительном падеже: «принять Ахметова».
      return findEmployee(raw)?.fullNameGenitive ?? '';
    case 'counterparty':
      return findCounterparty(raw)?.name ?? '';
    case 'date':
      return formatDocumentDate(raw);
    case 'money':
      return formatMoney(raw);
    default:
      return raw;
  }
}
