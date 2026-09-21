/**
 * Страница сохранённого документа.
 *
 * Здесь документ существует как предмет: лист, состояние, реквизиты и одно
 * действие — распечатать или сохранить в PDF. Печатается ровно тот лист,
 * который человек видел при заполнении (styles/print.css оставляет на бумаге
 * только его).
 */
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { findTemplate } from '@/api/mock/templates';
import { DocumentSheet } from '@/components/DocumentSheet/DocumentSheet';
import { SheetViewport } from '@/components/DocumentSheet/SheetViewport';
import { StatusStamp } from '@/components/StatusStamp/StatusStamp';
import { t } from '@/i18n';
import { useSession } from '@/store/session';
import { formatShortDate } from '@/utils/format';

import styles from './DocumentPage.module.css';

export default function DocumentPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [params] = useSearchParams();
  const { findDocument, company } = useSession();

  const record = documentId === undefined ? undefined : findDocument(documentId);
  const template = record === undefined ? undefined : findTemplate(record.templateId);

  if (record === undefined || template === undefined || company === null) {
    return (
      <div className={styles.missing}>
        <h1>{t.errors.documentNotFound}</h1>
        <Link to="/documents">{t.document.back}</Link>
      </div>
    );
  }

  const justSaved = params.get('saved') === '1';

  return (
    <div className={styles.page}>
      <div className={`${styles.bar} no-print`}>
        <Link className={styles.back} to="/documents">
          ← {t.document.back}
        </Link>

        <div className={styles.barActions}>
          <button type="button" className={styles.print} onClick={() => window.print()}>
            {t.document.print}
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <aside className={`${styles.side} no-print`}>
          {justSaved ? (
            <div className={styles.saved} role="status">
              <div className={styles.savedTitle}>{t.document.savedTitle}</div>
              <p className={styles.savedBody}>{t.document.savedBody}</p>
            </div>
          ) : null}

          <h1 className={styles.title}>{record.title}</h1>

          <dl className={styles.meta}>
            <div className={styles.metaRow}>
              <dt>{t.document.meta.status}</dt>
              <dd>
                <StatusStamp status={record.status} size="sm" />
              </dd>
            </div>
            <div className={styles.metaRow}>
              <dt>{t.document.meta.number}</dt>
              <dd className={record.number === null ? styles.metaMuted : 'tabular'}>
                {record.number ?? t.document.noNumber}
              </dd>
            </div>
            <div className={styles.metaRow}>
              <dt>{t.document.meta.created}</dt>
              <dd className="tabular">{formatShortDate(record.createdAt)}</dd>
            </div>
            <div className={styles.metaRow}>
              <dt>{t.document.meta.author}</dt>
              <dd>{record.authorName}</dd>
            </div>
            <div className={styles.metaRow}>
              <dt>{t.document.meta.company}</dt>
              <dd>{company.name}</dd>
            </div>
          </dl>

          {record.description === '' ? null : (
            <div className={styles.description}>
              <div className={styles.descriptionTitle}>{t.document.meta.description}</div>
              <p className={styles.descriptionBody}>{record.description}</p>
            </div>
          )}

          <p className={styles.hint}>{t.document.printHint}</p>
          <p className={styles.note}>{t.document.serverPdfNote}</p>
        </aside>

        <div className={styles.sheetArea}>
          {/* print-root: при печати на бумагу попадает только это поддерево. */}
          <div className="print-root">
            <SheetViewport>
              <DocumentSheet
                template={template}
                values={record.values}
                company={company}
                date={record.createdAt}
                number={record.number}
                draft={record.status === 'draft'}
              />
            </SheetViewport>
          </div>
        </div>
      </div>
    </div>
  );
}
