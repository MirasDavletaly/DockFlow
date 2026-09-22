/**
 * Лист документа.
 *
 * Это главный предмет на экране: человек заполняет форму и сразу видит
 * настоящий лист А4, а не «предпросмотр» за отдельной кнопкой. Ошибка в
 * утверждённом документе имеет юридические последствия, поэтому видеть
 * результат нужно до сохранения, а не после.
 *
 * Бланк повторяет настоящий документ группы – приказ «AL Nurdaulet KNT» –
 * вплоть до начертаний и кеглей: наименование 9 пунктов полужирным по центру,
 * город и дата 12 пунктов полужирным, тело в колонках по выключке, подпись
 * с чертой и лист ознакомления курсивом 9 пунктов. Размеры сняты с самого
 * файла, а не подобраны на глаз.
 *
 * Бланк один на все документы. Число колонок в теле задаёт сам шаблон
 * (`langs`): три – казахская, русская, английская; одна – пока перевода нет.
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

/** Доверенность выходит на русском и английском: казахской колонки в ней нет. */
const BI_LANGS: Array<keyof BiRow> = ['ru', 'en'];

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
        return run.bold === true ? (
          <strong key={key}>{run.text}</strong>
        ) : (
          <span key={key}>{run.text}</span>
        );
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

      const className = [
        isActive ? styles.valueActive : styles.value,
        // ФИО работника в приказе набрано полужирным – так в образце.
        run.bold === true ? styles.strong : '',
      ]
        .filter(Boolean)
        .join(' ');

      return (
        <span key={key} className={className}>
          {resolved}
        </span>
      );
    });
  }

  /** Ячейка таблицы: несколько абзацев одного языка. */
  function renderCell(paras: Para[] | undefined, keyPrefix: string, lang: DocLang) {
    return (paras ?? []).map((para, index) => (
      <p key={`${keyPrefix}-${index}`} className={styles.cellPara}>
        {renderRuns(para, `${keyPrefix}-${index}`, lang)}
      </p>
    ));
  }

  function renderBlock(block: DocBlock, index: number) {
    const key = `b-${index}`;

    switch (block.kind) {
      case 'letterhead': {
        // Логотип слева, три строки наименования по центру – так стоит на
        // настоящих бланках группы. Казахская строка первая: документ на
        // государственном языке идёт первым.
        const names = [company.legalNameKk, company.legalName, company.legalNameEn].filter(
          isFilled,
        );

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

      case 'place-date':
        // «Астана қ./г. Астана / Astana city» слева, дата справа. Разделители
        // стоят ровно так, как в образце.
        return (
          <div key={key} className={styles.placeDate}>
            <span className={styles.place}>{placeLine(company)}</span>
            <span className={styles.date}>{formatShortDate(date)}</span>
          </div>
        );

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
              <div
                key={`${key}-${rowIndex}`}
                className={styles.triRow}
                style={{ gridTemplateColumns: `repeat(${template.langs.length}, minmax(0, 1fr))` }}
              >
                {template.langs.map((lang) => (
                  <div key={lang} className={styles.triCell} lang={lang}>
                    {renderCell(row[lang], `${key}-${rowIndex}-${lang}`, lang)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );

      case 'tri-signature': {
        // Должность столбиком на трёх языках; черта и ФИО – на средней строке,
        // то есть на русской. Так в образце: подпись стоит против той строки,
        // на которой должность названа по-русски.
        const roles = [
          company.directorTitleKk,
          company.directorTitle,
          company.directorTitleEn,
        ].filter(isFilled);
        const name = [company.directorName, company.directorNameEn].filter(isFilled).join(' / ');
        const middle = Math.floor(roles.length / 2);

        return (
          <div key={key} className={styles.signature}>
            <div className={styles.signatureCaption}>{t.sheet.employer}</div>
            <div className={styles.signatureRoles}>
              {roles.map((role, roleIndex) => (
                <div key={role} className={styles.signatureRow}>
                  <span className={styles.signatureRole}>{role}</span>
                  {roleIndex === middle ? (
                    <>
                      <span className={styles.signatureLine} aria-hidden="true" />
                      <span className={styles.signatureName}>{name}</span>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'tri-acquaint':
        return (
          <div key={key} className={styles.acquaint}>
            <div>{t.sheet.acquaintKk}</div>
            <div>{t.sheet.acquaintTitle}</div>
            <div>{t.sheet.acquaintEn}</div>
            <div className={styles.acquaintLine} aria-hidden="true" />
            <div>{t.sheet.signatureCaption}</div>
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
            <div>
              {[company.directorTitle, company.directorTitleEn].filter(isFilled).join(' / ')}
            </div>
            <div>{company.name}</div>
            <div>{[company.directorName, company.directorNameEn].filter(isFilled).join(' / ')}</div>
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

/**
 * Город в шапке: «Астана қ./г. Астана / Astana city».
 *
 * Разделители стоят как в образце: после казахского названия «қ.» и сразу
 * косая без пробела. Если казахского или английского написания нет, часть
 * просто не печатается – три одинаковых слова через косую выглядели бы
 * как ошибка.
 */
function placeLine(company: Company): string {
  const parts: string[] = [];
  if (isFilled(company.cityKk)) parts.push(`${company.cityKk} қ./`);
  parts.push(`г. ${company.city}`);
  if (isFilled(company.cityEn)) parts.push(` / ${company.cityEn} city`);
  return parts.join('');
}

/** Реквизит заполнен: необязательные поля компании приходят и пустыми. */
function isFilled(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '';
}

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
 * текст приказа. Чего нет в карточке, то заменяется основной формой – она
 * видна на листе, и человек сразу поймёт, что данных не хватает.
 */
function employeeName(person: EmployeeBrief, lang: DocLang, form: 'nom' | 'obj'): string {
  // В английском падежей нет: обе формы дают одно и то же написание.
  if (lang === 'en') return person.fullNameEn ?? person.fullName;

  const nominative = lang === 'kk' ? (person.fullNameKk ?? person.fullName) : person.fullName;
  if (form === 'nom') return nominative;

  return lang === 'kk' ? (person.fullNameKkDative ?? nominative) : person.fullNameGenitive;
}

/**
 * Подставляет значение поля в текст документа.
 *
 * Поля, начинающиеся с «@», берутся из реквизитов компании: их человек не
 * вводит, и подменить их через форму нельзя.
 */
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

  // Значение, написанное для этой колонки отдельно: имя и число прописью
  // заполняются на каждом языке своим полем.
  if (def?.perLang === true && lang !== 'ru') {
    const written = values[`${fieldId}.${lang}`];
    if (written !== undefined && written.trim() !== '') return written;
  }

  switch (def?.kind) {
    case 'employee': {
      // У сохранённого документа фамилия берётся из его собственного снимка:
      // правка или удаление карточки в справочнике не должна менять уже
      // выпущенный приказ (CLAUDE.md, п. 3.4). У черновика снимка нет, и он
      // смотрит в текущий справочник компании.
      //
      // Если ФИО вписано руками, а не выбрано из справочника, падежа у него
      // нет – оно идёт в документ как есть. Форма об этом предупреждает.
      const person = people?.[raw] ?? findEmployeeIn(company.id, raw);
      return person === undefined ? raw : employeeName(person, lang, form);
    }
    case 'counterparty':
      return findCounterparty(raw)?.name ?? '';
    case 'date':
      // В документе дата пишется числами – «с 04.09.2026 по 27.09.2026», как
      // в настоящих приказах группы.
      return formatShortDate(raw);
    case 'money':
      return formatMoney(raw);
    default:
      return raw;
  }
}
