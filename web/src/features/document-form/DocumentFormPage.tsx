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
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { findEmployee } from '@/api/mock/directory';
import { findSection } from '@/api/mock/sections';
import { findTemplate } from '@/api/mock/templates';
import { DocumentSheet } from '@/components/DocumentSheet/DocumentSheet';
import { SheetViewport } from '@/components/DocumentSheet/SheetViewport';
import { Field } from '@/components/fields/Field';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { t } from '@/i18n';
import { useSession } from '@/store/session';

import styles from './DocumentFormPage.module.css';

import type { FieldDef } from '@/api/types';

export default function DocumentFormPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { company, createDocument } = useSession();

  const template = templateId === undefined ? undefined : findTemplate(templateId);

  const [values, setValues] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  const groups = useMemo(() => groupFields(template?.fields ?? []), [template]);

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
  const missing = template.fields.filter((f) => f.required && (values[f.id] ?? '') === '');
  const filledCount = template.fields.filter((f) => (values[f.id] ?? '') !== '').length;

  function setValue(field: FieldDef, next: string) {
    setValues((prev) => {
      const updated = { ...prev, [field.id]: next };

      // Выбор работника подставляет должность и подразделение из справочника.
      // Их можно поправить: в приказе иногда нужна формулировка, отличная от
      // штатного наименования, — но начинать с пустых полей незачем.
      if (field.kind === 'employee') {
        const employee = findEmployee(next);
        if (employee !== undefined) {
          if (prev['position'] === undefined || prev['position'] === '') {
            updated['position'] = employee.position;
          }
          if (prev['unit'] === undefined || prev['unit'] === '') {
            updated['unit'] = employee.unit;
          }
        }
      }

      return updated;
    });
  }

  function handleSave() {
    if (missing.length > 0) {
      setShowErrors(true);
      const first = document.getElementById(`field-${missing[0]?.id ?? ''}`);
      first?.focus();
      first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    const record = createDocument({
      templateId: doc.id,
      title: doc.title,
      values,
    });
    navigate(`/documents/${record.id}?saved=1`);
  }

  const section = findSection(template.sectionId);
  const subsection = section?.subsections.find((s) => s.id === template.subsectionId);
  const path = [section?.title, subsection?.title].filter(Boolean).join(' › ');

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={`${path} · ${t.form.series} ${template.series}`}
        title={template.title}
        subtitle={template.purpose}
        actions={
          <Link className={styles.backLink} to="/create">
            {t.form.back}
          </Link>
        }
      />

      <div className={styles.split}>
        <section className={styles.formColumn} aria-label={t.form.fillTitle}>
          <div className={styles.formBody}>
            {showErrors && missing.length > 0 ? (
              <div className={styles.validation} role="alert">
                <div className={styles.validationTitle}>{t.form.validationTitle}</div>
                <p className={styles.validationBody}>{t.form.validationBody}</p>
              </div>
            ) : null}

            {groups.map((group) => (
              <fieldset key={group.title} className={styles.group}>
                <legend className={styles.groupTitle}>{group.title}</legend>
                <div className={styles.groupFields}>
                  {group.fields.map((def) => (
                    <Field
                      key={def.id}
                      def={def}
                      value={values[def.id] ?? ''}
                      invalid={showErrors && def.required && (values[def.id] ?? '') === ''}
                      onChange={(next) => setValue(def, next)}
                      onFocus={() => setActiveField(def.id)}
                      onBlur={() => setActiveField(null)}
                    />
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <footer className={styles.formFooter}>
            <div className={styles.progress}>
              <span className={styles.progressText}>
                {t.form.filled} <span className="tabular">{filledCount}</span> {t.form.of}{' '}
                <span className="tabular">{template.fields.length}</span>
              </span>
              <span className={styles.progressTrack} aria-hidden="true">
                <span
                  className={styles.progressFill}
                  style={{ width: `${(filledCount / template.fields.length) * 100}%` }}
                />
              </span>
            </div>

            <button type="button" className={styles.save} onClick={handleSave}>
              {t.form.save}
            </button>
          </footer>
        </section>

        <section className={styles.sheetColumn} aria-label={t.form.sheetTitle}>
          {template.reviewed ? null : (
            <div className={styles.legalNotice}>
              <div className={styles.legalTitle}>{t.form.legalDraftTitle}</div>
              <p className={styles.legalBody}>{t.form.legalDraftBody}</p>
            </div>
          )}

          <SheetViewport>
            <DocumentSheet
              template={template}
              values={values}
              company={company}
              date={today}
              draft
              activeFieldId={activeField}
            />
          </SheetViewport>
        </section>
      </div>
    </div>
  );
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
