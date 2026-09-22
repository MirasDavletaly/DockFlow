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
import { findCounterparty } from '@/api/mock/directory';
import { findEmployeeIn } from '@/store/db';
import { t } from '@/i18n';
import { formatDocumentDate, formatMoney, formatShortDate } from '@/utils/format';

import styles from './DocumentSheet.module.css';

import type {
  BiRow,
  Company,
  DocBlock,
  DocLang,
  DocumentTemplate,
  EmployeeBrief,
  FieldDef,
  Para,
  Run,
} from '@/api/types';

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
  /**
   * Снимок карточек людей из сохранённого документа. Пока его нет (черновик),
   * фамилии берутся из текущего справочника компании.
   */
  people?: Record<string, EmployeeBrief>;
}

export function DocumentSheet({
  template,
  values,
  company,
  date,
  number = null,
  draft = false,
  activeFieldId = null,
  people,
}: Props) {
  const fieldsById = new Map<string, FieldDef>(template.fields.map((f) => [f.id, f]));

  function renderRuns(runs: Run[], keyPrefix: string, lang: DocLang = 'ru') {
    return runs.map((run, index) => {
      const key = `${keyPrefix}-${index}`;

      if ('text' in run) {
        return <span key={key}>{run.text}</span>;
      }

      const resolved =
        resolveField(run.field, values, company, fieldsById, people, lang) ||
        (run.fallback === undefined
          ? ''
          : resolveField(run.fallback, values, company, fieldsById, people, lang));
      const isActive = activeFieldId !== null && baseFieldId(run.field) === activeFieldId;

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
            {/* Логотип компании – он же стоит в шапке настоящих бланков.
                Пока логотипа нет, его место занимают буквы из monogram. */}
            <div className={styles.headerMark} aria-hidden="true">
              {company.logo === undefined ? (
                <span className={styles.headerMonogram}>{company.monogram}</span>
              ) : (
                <img className={styles.headerLogo} src={company.logo} alt="" />
              )}
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
        // Линии между должностью и фамилией нет: на бумаге её рисует не
        // бланк, а подпись. Пустая линия в готовом документе читается как
        // место, которое забыли заполнить.
        return (
          <div key={key} className={styles.signature}>
            <span className={styles.signatureRole}>{company.directorTitle}</span>
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

      // ── Бланк приказа ───────────────────────────────────────────────────

      case 'letterhead': {
        // Логотип слева, три строки наименования по центру – так стоит на
        // настоящих бланках группы. Казахская строка первая: документ на
        // государственном языке идёт первым.
        const names = [
          company.legalNameKk,
          company.legalName,
          company.legalNameEn,
        ].filter(isFilled);

        return (
          <header key={key} className={styles.letterhead}>
            <div className={styles.letterheadMark}>
              {company.logo === undefined ? (
                <span className={styles.letterheadMonogram} aria-hidden="true">
                  {company.monogram}
                </span>
              ) : (
                <img className={styles.letterheadLogo} src={company.logo} alt="" />
              )}
            </div>
            <div className={styles.letterheadNames}>
              {names.map((name) => (
                <div key={name} className={styles.letterheadName}>
                  {name}
                </div>
              ))}
            </div>
          </header>
        );
      }

      case 'place-date': {
        // «Ақсай қ./г. Аксай / Aksai city» слева, дата справа. Если казахского
        // и английского написания города нет, печатается одно русское: три
        // одинаковых слова через косую выглядели бы как ошибка.
        const parts: string[] = [];
        if (isFilled(company.cityKk)) parts.push(`${company.cityKk} қ.`);
        parts.push(`г. ${company.city}`);
        if (isFilled(company.cityEn)) parts.push(`${company.cityEn} city`);

        return (
          <div key={key} className={styles.placeDate}>
            <span className={styles.place}>{parts.join(' / ')}</span>
            <span className={`${styles.date} tabular`}>{formatShortDate(date)}</span>
          </div>
        );
      }

      case 'order-title': {
        // Номер стоит в той же строке, что и слово «ПРИКАЗ», и подсвечивается,
        // когда курсор в поле номера.
        const numberActive = activeFieldId === '@number';
        return (
          <h1 key={key} className={styles.orderTitle}>
            {block.words.kk} / {block.words.ru} / {block.words.en} №{' '}
            <span
              className={[
                number === null ? styles.numberBlank : styles.numberValue,
                numberActive ? styles.numberHighlight : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {number ?? t.sheet.numberPlaceholder}
            </span>
          </h1>
        );
      }

      case 'tri-line':
        return (
          <p key={key} className={styles.triLine}>
            {block.words.kk} / {block.words.ru} / {block.words.en}
          </p>
        );

      case 'tri-table':
        return (
          <div key={key} className={styles.triTable}>
            {block.rows.map((row, rowIndex) => (
              <div key={`${key}-${rowIndex}`} className={styles.triRow}>
                {TRI_LANGS.map((lang) => (
                  <div key={lang} className={styles.triCell} lang={lang}>
                    {renderCell(row[lang], `${key}-${rowIndex}-${lang}`, lang)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );

      case 'tri-signature':
        // Должность на трёх языках столбиком слева, ФИО справа: кириллицей и
        // латиницей через косую, как на настоящих приказах.
        return (
          <div key={key} className={styles.triSignature}>
            <div className={styles.triSignatureRole}>
              {[company.directorTitleKk, company.directorTitle, company.directorTitleEn]
                .filter(isFilled)
                .map((role) => (
                  <div key={role}>{role}</div>
                ))}
            </div>
            <div className={styles.triSignatureName}>
              {[company.directorName, company.directorNameEn].filter(isFilled).join(' / ')}
            </div>
          </div>
        );

      case 'tri-acquaint':
        return (
          <div key={key} className={styles.triAcquaint}>
            <div className={styles.triAcquaintTitle}>
              <div>Таныстым:</div>
              <div>{t.sheet.acquaintTitle}</div>
              <div>I have read and understood</div>
            </div>
            <div className={styles.triAcquaintLine} aria-hidden="true" />
            <div className={styles.triAcquaintHint}>
              (Аты-Жөні / Ф.И.О. / full name) Қолы / Подпись / Signature
            </div>
          </div>
        );

      case 'executor':
        return (
          <div key={key} className={styles.executor}>
            {renderRuns(block.runs, key)}
          </div>
        );

      // ── Бланк доверенности ──────────────────────────────────────────────

      case 'poa-title':
        return (
          <div key={key} className={styles.poaTitle}>
            <div className={styles.poaTitleCell} lang="ru">
              <div className={styles.poaTitleText}>{block.words.ru}</div>
              <div className={styles.poaTitleMeta}>
                Выдана в г. {company.city}, {formatDocumentDate(date)}
              </div>
            </div>
            <div className={styles.poaTitleCell} lang="en">
              <div className={styles.poaTitleText}>{block.words.en}</div>
              <div className={styles.poaTitleMeta}>
                Issued in {company.cityEn ?? company.city} city, {formatShortDate(date)}
              </div>
            </div>
          </div>
        );

      case 'bi-table':
        return (
          <div key={key} className={styles.biTable}>
            {block.rows.map((row, rowIndex) => (
              <div key={`${key}-${rowIndex}`} className={styles.biRow}>
                {BI_LANGS.map((lang) => (
                  <div key={lang} className={styles.biCell} lang={lang}>
                    {renderCell(row[lang], `${key}-${rowIndex}-${lang}`, lang)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );

      case 'poa-signature':
        return (
          <div key={key} className={styles.poaSignature}>
            <div className={styles.poaSignatureLine} aria-hidden="true" />
            <div className={styles.poaSignatureRole}>
              {[company.directorTitle, company.directorTitleEn].filter(isFilled).join(' / ')}
            </div>
            <div className={styles.poaSignatureCompany}>{company.name}</div>
            <div className={styles.poaSignatureName}>
              {[company.directorName, company.directorNameEn].filter(isFilled).join(' / ')}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  /** Ячейка таблицы: несколько абзацев одного языка. */
  function renderCell(paras: Para[], keyPrefix: string, lang: DocLang) {
    return paras.map((para, index) => (
      <p key={`${keyPrefix}-${index}`} className={styles.cellPara}>
        {renderRuns(para, `${keyPrefix}-${index}`, lang)}
      </p>
    ));
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

const TRI_LANGS: DocLang[] = ['kk', 'ru', 'en'];
const BI_LANGS: Array<keyof BiRow> = ['ru', 'en'];

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
/**
 * Поле в шаблоне может быть записано с формой слова: `employee:nom`.
 *
 * Это не новое поле, а то же самое в другом падеже. По умолчанию берётся та
 * форма, в какой ФИО стоит после глагола приказа: «принять Ахметова»,
 * «Ахметовке демалыс беру». `:nom` – именительный падеж, он нужен там, где
 * работник стоит подлежащим: «Сағын Дидар Есболұлы ... қабылдансын».
 *
 * Значение и подсветка при этом общие, поэтому имя поля отделяется от формы.
 */
function baseFieldId(fieldId: string): string {
  const colon = fieldId.indexOf(':');
  return colon === -1 ? fieldId : fieldId.slice(0, colon);
}

function fieldForm(fieldId: string): 'nom' | 'obj' {
  return fieldId.endsWith(':nom') ? 'nom' : 'obj';
}

/**
 * ФИО работника на нужном языке и в нужной форме.
 *
 * Падежи и написание латиницей хранятся данными, а не вычисляются: склонять
 * казахские и составные фамилии программно нельзя, ошибка попадёт прямо в
 * текст приказа. Чего нет в карточке, то заменяется основной формой – она видна на
 * листе, и человек сразу поймёт, что данных не хватает.
 */
function employeeName(person: EmployeeBrief, lang: DocLang, form: 'nom' | 'obj'): string {
  // В английском падежей нет: обе формы дают одно и то же написание.
  if (lang === 'en') return person.fullNameEn ?? person.fullName;

  const nominative = lang === 'kk' ? (person.fullNameKk ?? person.fullName) : person.fullName;
  if (form === 'nom') return nominative;

  return lang === 'kk'
    ? (person.fullNameKkDative ?? nominative)
    : person.fullNameGenitive;
}

function resolveField(
  rawFieldId: string,
  values: Record<string, string>,
  company: Company,
  fieldsById: Map<string, FieldDef>,
  people: Record<string, EmployeeBrief> | undefined,
  lang: DocLang,
): string {
  const fieldId = baseFieldId(rawFieldId);
  const form = fieldForm(rawFieldId);

  if (fieldId.startsWith('@company.')) {
    const key = fieldId.slice('@company.'.length) as keyof Company;
    const value = company[key];
    return typeof value === 'string' ? value : '';
  }

  const raw = values[fieldId];
  if (raw === undefined || raw === '') return '';

  const def = fieldsById.get(fieldId);
  switch (def?.kind) {
    case 'employee': {
      // В приказах работник стоит в родительном падеже: «принять Ахметова».
      //
      // У сохранённого документа фамилия берётся из его собственного снимка:
      // правка или удаление карточки в справочнике не должна менять уже
      // выпущенный приказ (CLAUDE.md, п. 3.4). У черновика снимка нет, и он
      // смотрит в текущий справочник компании.
      //
      // Если ФИО вписано руками, а не выбрано из справочника, падежа у него
      // нет — оно идёт в документ как есть. Форма об этом предупреждает.
      const person = people?.[raw] ?? findEmployeeIn(company.id, raw);
      return person === undefined ? raw : employeeName(person, lang, form);
    }
    case 'counterparty':
      return findCounterparty(raw)?.name ?? '';
    case 'date':
      // В колонках приказа дата пишется числами («с 23.06.2026 по 02.07.2026»),
      // как в настоящих документах группы. На простом листе – словами.
      return lang === 'ru' ? formatDocumentDate(raw) : formatShortDate(raw);
    case 'money':
      return formatMoney(raw);
    default:
      return raw;
  }
}
