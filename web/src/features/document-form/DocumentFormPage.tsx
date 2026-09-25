/**
 * Заполнение документа.
 *
 * Слева поля, справа лист. Лист виден всё время, а не по кнопке
 * «предпросмотр»: человек должен видеть, что именно он выпускает, до того
 * как нажмёт «Сохранить», — ошибка в утверждённом документе имеет
 * юридические последствия.
 *
 * Поле, на котором стоит курсор, подсвечивается в листе. Это единственная
 * связь между двумя половинами экрана, и она же отвечает на вопрос
 * «а куда попадёт то, что я сейчас ввожу».
 *
 * Ничего из введённого не теряется. Черновик пишется сам через полсекунды
 * после последнего нажатия клавиши, а также при уходе со страницы, при
 * перезагрузке и при закрытии вкладки. Кнопка «назад» и случайно закрытая
 * вкладка перестают быть потерей работы.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { findSection } from '@/api/mock/sections';
import { findTemplate } from '@/api/mock/templates';
import { DocumentSheet } from '@/components/DocumentSheet/DocumentSheet';
import { SheetViewport } from '@/components/DocumentSheet/SheetViewport';
import { Field } from '@/components/fields/Field';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { lang, t } from '@/i18n';
import { documentTitle, tc } from '@/i18n/content';
import { DocumentNumberTakenError } from '@/store/documentNumber';
import { useSession } from '@/store/session';
import { translateJobTitle } from '@/utils/jobTitles';
import { englishName, transliterate } from '@/utils/names';
import { numberToWords } from '@/utils/numberWords';

import { dateBounds, checkField, validateFields } from './validation';

import styles from './DocumentFormPage.module.css';

import type { Company, DocLang, EmployeeBrief, FieldDef } from '@/api/types';

/** Через сколько после последнего нажатия клавиши черновик уходит в хранилище. */
const AUTOSAVE_DELAY_MS = 600;

export default function DocumentFormPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { company, employees, saveDocument, findDocument, numberTaken, findCompanyTemplate } =
    useSession();

  // Правим существующую запись, если её идентификатор пришёл в адресе.
  const editingId = params.get('doc');
  const existing = editingId === null ? undefined : findDocument(editingId);

  // Шаблон каталога или шаблон компании из конструктора; у выпущенного
  // документа по шаблону компании – его снимок.
  const template =
    templateId === undefined
      ? undefined
      : (findTemplate(templateId) ?? findCompanyTemplate(templateId, existing));

  const [values, setValues] = useState<Record<string, string>>(() =>
    existing === undefined ? initialValues(template?.fields ?? [], company) : existing.values,
  );
  // Номер, описание и «для кого» не входят в шаблон: номер — реквизит
  // регистрации, остальные два вообще не печатаются. Держим их отдельно.
  const [number, setNumber] = useState(existing?.number ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [subject, setSubject] = useState(existing?.subject ?? '');
  const [showErrors, setShowErrors] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  const groups = useMemo(() => groupFields(template?.fields ?? []), [template]);

  // Идентификатор черновика. Первое автосохранение его заводит, дальше та же
  // запись правится — нового документа при каждом нажатии клавиши не появляется.
  const draftId = useRef<string | null>(existing?.id ?? null);
  const dirty = useRef(false);
  const savedManually = useRef(false);

  const snapshot = useRef({ values, number, description, subject, title: template?.title ?? '' });
  snapshot.current = { values, number, description, subject, title: template?.title ?? '' };

  // Правка сохранённого документа черновиком не пишется: выпущенный документ
  // меняется только по кнопке «Сохранить», иначе автосохранение молча
  // превратило бы его обратно в черновик и сняло снимок реквизитов.
  const editsSaved = existing?.status === 'saved';

  const flushDraft = useCallback(() => {
    if (!dirty.current || savedManually.current || template === undefined) return;
    if (editsSaved) return;

    const current = snapshot.current;
    const empty =
      Object.values(current.values).every((v) => v.trim() === '') &&
      current.number.trim() === '' &&
      current.description.trim() === '' &&
      current.subject.trim() === '';

    // Пустую форму в черновики не пишем: человек открыл документ, посмотрел
    // и ушёл — реестр не должен зарастать пустышками.
    if (empty) return;

    const record = saveDocument({
      ...(draftId.current === null ? {} : { id: draftId.current }),
      templateId: template.id,
      sectionId: template.sectionId,
      title: template.title,
      ...(template.titleEn === undefined ? {} : { titleEn: template.titleEn }),
      number: current.number,
      description: current.description,
      subject: current.subject,
      values: current.values,
      status: 'draft',
    });

    draftId.current = record.id;
    dirty.current = false;
  }, [saveDocument, template, editsSaved]);

  // Отложенная запись: через полсекунды после последнего нажатия клавиши.
  useEffect(() => {
    if (!dirty.current) return undefined;

    const timer = window.setTimeout(flushDraft, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [values, number, description, subject, flushDraft]);

  // Перезагрузка, закрытие вкладки и переход по внешней ссылке. `pagehide`
  // срабатывает и там, где `beforeunload` не срабатывает (мобильный Safari).
  useEffect(() => {
    window.addEventListener('pagehide', flushDraft);
    window.addEventListener('beforeunload', flushDraft);
    return () => {
      window.removeEventListener('pagehide', flushDraft);
      window.removeEventListener('beforeunload', flushDraft);
      // Уход на другой экран сайта, в том числе кнопкой «назад».
      flushDraft();
    };
  }, [flushDraft]);

  if (template === undefined || company === null) {
    return (
      <div className={styles.missing}>
        <h1>{t.errors.templateNotFound}</h1>
        <Link to="/create">{t.form.back}</Link>
      </div>
    );
  }

  // Ссылки после проверки выше: объявления функций поднимаются, и внутри них
  // сужение типа не сохраняется — поэтому берём уже проверенные значения.
  const doc = template;
  const today = new Date().toISOString().slice(0, 10);
  const problems = validateFields(doc.fields, values);
  // Номер проверяется сразу, пока его вводят: узнавать о занятом номере
  // после нажатия «Сохранить» – лишний круг.
  const numberProblem = numberTaken(number, draftId.current ?? undefined)
    ? t.form.numberTaken
    : null;
  const filledCount = doc.fields.filter((f) => (values[f.id] ?? '') !== '').length;

  function setValue(field: FieldDef, next: string) {
    dirty.current = true;
    savedManually.current = false;

    setValues((prev) => {
      const updated = { ...prev, [field.id]: next };

      // Выбор работника подставляет должность и подразделение из справочника.
      // Их можно поправить: в приказе иногда нужна формулировка, отличная от
      // штатного наименования, — но начинать с пустых полей незачем.
      if (field.kind === 'employee') {
        const employee = employees.find((e) => e.id === next);
        if (employee !== undefined) {
          if ((prev['position'] ?? '') === '') updated['position'] = employee.position;
          // Должность на казахском и английском – с карточки, если там есть.
          if ((prev['position.kk'] ?? '') === '' && employee.positionKk !== undefined) {
            updated['position.kk'] = employee.positionKk;
          }
          if ((prev['position.en'] ?? '') === '' && employee.positionEn !== undefined) {
            updated['position.en'] = employee.positionEn;
          }
          if ((prev['unit'] ?? '') === '') updated['unit'] = employee.unit;
          // Подразделение на казахском и английском – с карточки, если там есть.
          if ((prev['unit.kk'] ?? '') === '' && employee.unitKk !== undefined) {
            updated['unit.kk'] = employee.unitKk;
          }
          if ((prev['unit.en'] ?? '') === '' && employee.unitEn !== undefined) {
            updated['unit.en'] = employee.unitEn;
          }
          if ((prev['positionFrom'] ?? '') === '') updated['positionFrom'] = employee.position;
        }
      }

      // Имя на казахском и латиницей встаёт само («Тест день 2»): с карточки,
      // а если там нет – казахское совпадает с русским, латиница собирается
      // транслитерацией. Написание, которое человек поправил руками, не
      // затирается: меняется только то, что было подставлено автоматически.
      if (field.kind === 'employee' && field.perLang === true) {
        const before = autoNames(prev[field.id] ?? '', employees);
        const after = autoNames(next, employees);
        for (const lang of ['kk', 'en'] as const) {
          const key = `${field.id}.${lang}`;
          const current = prev[key] ?? '';
          if (current === '' || current === before[lang]) updated[key] = after[lang];
        }
      }

      // Должность и подразделение на казахском и английском – из словаря
      // частых названий, для каждого поля на трёх языках, которое поменялось
      // (в том числе подставленного с карточки работника). Нет в словаре –
      // перевод остаётся за человеком; поправленный руками не затирается.
      for (const def of doc.fields) {
        if (def.perLang !== true || def.kind === 'employee') continue;
        const before = prev[def.id] ?? '';
        const after = updated[def.id] ?? '';
        if (before === after) continue;
        for (const lang of ['kk', 'en'] as const) {
          const key = `${def.id}.${lang}`;
          const current = updated[key] ?? '';
          const autoBefore = translateJobTitle(before, lang) ?? '';
          const autoAfter = translateJobTitle(after, lang) ?? '';
          if (current === '' || current === autoBefore) updated[key] = autoAfter;
        }
      }

      // Число прописью считается из числа – на трёх языках сразу. Число
      // поменяли – слова пересчитываются: слова от прежнего числа в
      // документе были бы ошибкой.
      for (const words of doc.fields.filter((f) => f.wordsOf === field.id)) {
        updated[words.id] = numberToWords(next, 'ru');
        updated[`${words.id}.kk`] = numberToWords(next, 'kk');
        updated[`${words.id}.en`] = numberToWords(next, 'en');
      }

      return updated;
    });

    // «Для кого» заполняется само по выбранному работнику: спрашивать то,
    // что система уже знает, значит заставлять вводить дважды.
    if (field.kind === 'employee' && subject.trim() === '') {
      const employee = employees.find((e) => e.id === next);
      setSubject(employee?.fullName ?? next);
    }
  }

  function markDirty() {
    dirty.current = true;
    savedManually.current = false;
  }

  function focusField(fieldId: string) {
    const target = document.getElementById(`field-${fieldId}`);
    target?.focus();
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function handleSave() {
    if (problems.length > 0) {
      setShowErrors(true);
      focusField(problems[0]?.fieldId ?? '');
      return;
    }
    if (numberProblem !== null) {
      setShowErrors(true);
      focusField(registration.number.id);
      return;
    }

    let record;
    try {
      record = saveDocument({
        ...(draftId.current === null ? {} : { id: draftId.current }),
        templateId: doc.id,
        sectionId: doc.sectionId,
        title: doc.title,
        ...(doc.titleEn === undefined ? {} : { titleEn: doc.titleEn }),
        number,
        description,
        subject,
        values,
        status: 'saved',
      });
    } catch (error) {
      // Номер заняли в другой вкладке между проверкой и сохранением.
      if (error instanceof DocumentNumberTakenError) {
        setShowErrors(true);
        focusField(registration.number.id);
        return;
      }
      throw error;
    }

    savedManually.current = true;
    dirty.current = false;
    navigate(`/documents/${record.id}?saved=1`);
  }

  const section = findSection(doc.sectionId);
  const subsection = section?.subsections.find((s) => s.id === doc.subsectionId);
  const path = [section?.title, subsection?.title]
    .filter((part): part is string => part !== undefined && part !== '')
    .map(tc)
    .join(' › ');

  const registration = registrationFields();

  const problemOf = (fieldId: string): string | null => {
    if (!showErrors) return null;
    return problems.find((p) => p.fieldId === fieldId)?.message ?? null;
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={`${path} · ${t.form.series} ${lang === 'en' ? transliterate(doc.series) : doc.series}`}
        title={documentTitle(doc)}
        subtitle={tc(doc.purpose)}
        actions={
          <Link className={styles.backLink} to="/create">
            {t.form.back}
          </Link>
        }
      />

      <div className={styles.split}>
        <section className={styles.formColumn} aria-label={t.form.fillTitle}>
          <div className={styles.formBody}>
            {existing === undefined ? null : (
              <div className={styles.editingNote} role="status">
                {existing.status === 'draft' ? t.form.editingDraft : t.form.editingSaved}
              </div>
            )}

            {showErrors && (problems.length > 0 || numberProblem !== null) ? (
              <div className={styles.validation} role="alert">
                <div className={styles.validationTitle}>{t.form.validationTitle}</div>
                <p className={styles.validationBody}>{t.form.validationBody}</p>
              </div>
            ) : null}

            {groups.map((group) => (
              <fieldset key={group.title} className={styles.group}>
                <legend className={styles.groupTitle}>{tc(group.title)}</legend>
                <div className={styles.groupFields}>
                  {group.fields.map((def) => (
                    <Field
                      key={def.id}
                      def={def}
                      value={values[def.id] ?? ''}
                      langs={doc.langs}
                      translations={translationsOf(def, values)}
                      placeholders={placeholdersOf(def, values, employees)}
                      onTranslate={(lang, next) => {
                        markDirty();
                        setValues((prev) => ({ ...prev, [`${def.id}.${lang}`]: next }));
                      }}
                      // Ошибка показывается сразу, как только её исправили или
                      // создали заново: ждать нажатия «Сохранить» второй раз
                      // незачем, человек уже знает, что не так.
                      problem={problemOf(def.id) ?? (showErrors ? null : liveProblem(def, values, doc.fields))}
                      employees={employees}
                      bounds={dateBounds(def, values)}
                      onChange={(next) => setValue(def, next)}
                      onFocus={() => setActiveField(def.id)}
                      onBlur={() => setActiveField(null)}
                    />
                  ))}
                </div>
              </fieldset>
            ))}

            <fieldset className={styles.group}>
              <legend className={styles.groupTitle}>{t.form.registrationGroup}</legend>
              <div className={styles.groupFields}>
                <Field
                  def={registration.subject}
                  value={subject}
                  onChange={(next) => {
                    markDirty();
                    setSubject(next);
                  }}
                  onFocus={() => setActiveField(registration.subject.id)}
                  onBlur={() => setActiveField(null)}
                />
                <Field
                  def={registration.number}
                  value={number}
                  problem={numberProblem}
                  onChange={(next) => {
                    markDirty();
                    setNumber(next);
                  }}
                  onFocus={() => setActiveField(registration.number.id)}
                  onBlur={() => setActiveField(null)}
                />
                <Field
                  def={registration.description}
                  value={description}
                  onChange={(next) => {
                    markDirty();
                    setDescription(next);
                  }}
                  onFocus={() => setActiveField(registration.description.id)}
                  onBlur={() => setActiveField(null)}
                />
              </div>
            </fieldset>

            <p className={styles.autosave}>
              <span className={styles.autosaveTitle}>{t.form.draftAutosaved}</span>{' '}
              {t.form.draftAutosavedHint}
            </p>
          </div>

          <footer className={styles.formFooter}>
            <div className={styles.progress}>
              <span className={styles.progressText}>
                {t.form.filled} <span className="tabular">{filledCount}</span> {t.form.of}{' '}
                <span className="tabular">{doc.fields.length}</span>
              </span>
              <span className={styles.progressTrack} aria-hidden="true">
                <span
                  className={styles.progressFill}
                  style={{ width: `${(filledCount / doc.fields.length) * 100}%` }}
                />
              </span>
            </div>

            <button type="button" className={styles.save} onClick={handleSave}>
              {t.form.save}
            </button>
          </footer>
        </section>

        <section className={styles.sheetColumn} aria-label={t.form.sheetTitle}>
          {/* Типовой шаблон собран по распространённым образцам, а не по
              документу компании: об этом сказано сверху, до листа
              («Тест день 2»). На бумагу пометка не идёт. */}
          {doc.generic === true ? (
            <div className={styles.legalNotice} role="note">
              <div className={styles.legalTitle}>{t.form.genericTitle}</div>
              <p className={styles.legalBody}>{t.form.genericBody}</p>
            </div>
          ) : doc.custom === true ? (
            <div className={styles.legalNotice} role="note">
              <div className={styles.legalTitle}>{t.templates.previewTitle}</div>
              <p className={styles.legalBody}>{t.templates.previewBody}</p>
            </div>
          ) : doc.reviewed ? null : (
            <div className={styles.legalNotice}>
              <div className={styles.legalTitle}>{t.form.legalDraftTitle}</div>
              <p className={styles.legalBody}>{t.form.legalDraftBody}</p>
            </div>
          )}

          {/* На скольких языках выходит документ. Одноязычный лист – это не
              то же самое, что бланк компании, и человек должен видеть разницу
              до того, как понесёт бумагу подписывать. */}
          {doc.langs.length > 1 ? (
            <p className={styles.langsNote}>
              <span className={styles.langsTitle}>{t.form.langsTitle}:</span> {t.form.langsFull}
            </p>
          ) : (
            <div className={styles.langsWarn}>
              <div className={styles.legalTitle}>{t.form.langsSimpleTitle}</div>
              <p className={styles.legalBody}>{t.form.langsSimpleBody}</p>
            </div>
          )}

          <SheetViewport>
            <DocumentSheet
              template={doc}
              values={values}
              company={company}
              date={today}
              number={number.trim() === '' ? null : number.trim()}
              activeFieldId={activeField}
            />
          </SheetViewport>
        </section>
      </div>
    </div>
  );
}

/** Уже написанные переводы значения: ключи «id.kk», «id.en». */
function translationsOf(
  def: FieldDef,
  values: Record<string, string>,
): Partial<Record<DocLang, string>> {
  if (def.perLang !== true) return {};

  const out: Partial<Record<DocLang, string>> = {};
  for (const lang of ['kk', 'en'] as const) {
    const written = values[`${def.id}.${lang}`];
    if (written !== undefined) out[lang] = written;
  }
  return out;
}

/**
 * Что попадёт в колонку, пока перевод не написан.
 *
 * У работника из справочника это ФИО с его карточки, у остального –
 * русское значение. Подсказка показывает ровно то, что напечатается,
 * а не выдуманный пример.
 */
function placeholdersOf(
  def: FieldDef,
  values: Record<string, string>,
  employees: EmployeeBrief[],
): Partial<Record<DocLang, string>> {
  if (def.perLang !== true) return {};

  const raw = values[def.id] ?? '';
  if (def.kind === 'employee') return autoNames(raw, employees);

  return { kk: raw, en: raw };
}

/**
 * Имя работника на казахском и латиницей, если его не вписали руками.
 *
 * С карточки, а если там пусто – казахское пишется как русское (кириллица
 * одна), латиница собирается транслитерацией: «Askhat Akhmetov».
 */
function autoNames(raw: string, employees: EmployeeBrief[]): { kk: string; en: string } {
  if (raw.trim() === '') return { kk: '', en: '' };
  const person = employees.find((e) => e.id === raw);
  const fullName = person?.fullName ?? raw;
  return {
    kk: person?.fullNameKk ?? fullName,
    en: person?.fullNameEn ?? englishName(fullName),
  };
}

/**
 * Ошибка, которую видно до нажатия «Сохранить».
 *
 * Пустое обязательное поле так не подсвечивается: человек ещё не дошёл до
 * него. А вот дата возвращения раньше даты выезда — уже ошибка, и сказать
 * о ней нужно сразу, а не после нажатия кнопки.
 */
function liveProblem(
  def: FieldDef,
  values: Record<string, string>,
  fields: FieldDef[],
): string | null {
  if ((values[def.id] ?? '') === '') return null;
  return checkField(def, values, fields);
}

/** Значения по умолчанию: реквизиты компании, которые человек может поправить. */
function initialValues(fields: FieldDef[], company: Company | null): Record<string, string> {
  const values: Record<string, string> = {};
  if (company === null) return values;

  for (const field of fields) {
    if (field.defaultFrom === undefined) continue;
    if (!field.defaultFrom.startsWith('@company.')) continue;

    const key = field.defaultFrom.slice('@company.'.length) as keyof Company;
    const value = company[key];
    if (typeof value === 'string' && value !== '') values[field.id] = value;
  }

  return values;
}

/**
 * Номер, «для кого» и описание описаны теми же FieldDef, что и поля шаблона:
 * так они выглядят и ведут себя как остальная форма, но в снимок значений
 * документа не попадают.
 *
 * Собираются функцией, а не константой: константа прочитала бы словарь один
 * раз при загрузке модуля, и после переключения языка подписи остались бы
 * на прежнем.
 */
function registrationFields(): { number: FieldDef; subject: FieldDef; description: FieldDef } {
  return {
    number: {
      id: '@number',
      kind: 'text',
      label: t.form.numberLabel,
      hint: t.form.numberHint,
      required: false,
      group: t.form.registrationGroup,
    },
    subject: {
      id: '@subject',
      kind: 'text',
      label: t.form.subjectLabel,
      hint: t.form.subjectHint,
      required: false,
      group: t.form.registrationGroup,
    },
    description: {
      id: '@description',
      kind: 'textarea',
      label: t.form.descriptionLabel,
      hint: t.form.descriptionHint,
      required: false,
      group: t.form.registrationGroup,
    },
  };
}

interface Group {
  title: string;
  fields: FieldDef[];
}

/** Поля идут группами в том порядке, в каком они объявлены в шаблоне. */
function groupFields(fields: FieldDef[]): Group[] {
  const groups: Group[] = [];

  for (const field of fields) {
    const last = groups.at(-1);
    if (last !== undefined && last.title === field.group) {
      last.fields.push(field);
    } else {
      groups.push({ title: field.group, fields: [field] });
    }
  }

  return groups;
}
