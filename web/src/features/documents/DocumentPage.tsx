/**
 * Страница сохранённого документа.
 *
 * Здесь документ существует как предмет: лист, состояние, реквизиты и
 * действия — распечатать, исправить, удалить. Печатается ровно тот лист,
 * который человек видел при заполнении (styles/print.css оставляет на бумаге
 * только его).
 *
 * Лист собирается из снимка реквизитов компании, а не из текущих значений:
 * смена директора или адреса не должна переписывать уже выпущенные приказы
 * задним числом (CLAUDE.md, п. 3.4). У черновика снимка нет — он ещё не
 * выпущен и показывает то, что есть у компании сейчас.
 */
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { canDeleteDocument, canEditDocument } from '@/access/policy';
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
  const navigate = useNavigate();
  const { findDocument, company, user, deleteDocument } = useSession();

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

  const subject = { user, companyId: company.id };
  const justSaved = params.get('saved') === '1';
  const isDraft = record.status === 'draft';

  // Снимок реквизитов на момент сохранения. У черновика его нет.
  const sheetCompany = record.companySnapshot ?? company;
  const requisitesFrozen = record.companySnapshot !== undefined;

  return (
    <div className={styles.page}>
      <div className={`${styles.bar} no-print`}>
        <Link className={styles.back} to="/documents">
          ← {t.document.back}
        </Link>

        <div className={styles.barActions}>
          {canEditDocument(subject, record) ? (
            <Link className={styles.edit} to={`/create/${record.templateId}?doc=${record.id}`}>
              {t.document.edit}
            </Link>
          ) : null}

          {canDeleteDocument(subject, record) ? (
            <button
              type="button"
              className={styles.delete}
              onClick={() => {
                if (!window.confirm(t.document.deleteConfirm)) return;
                deleteDocument(record.id);
                navigate('/documents', { replace: true });
              }}
            >
              {t.document.delete}
            </button>
          ) : null}

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

          {isDraft ? (
            <div className={styles.draftNote} role="note">
              <div className={styles.savedTitle}>{t.document.draftTitle}</div>
              <p className={styles.savedBody}>{t.document.draftBody}</p>
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
            {record.subject === '' ? null : (
              <div className={styles.metaRow}>
                <dt>{t.document.meta.subject}</dt>
                <dd>{record.subject}</dd>
              </div>
            )}
            <div className={styles.metaRow}>
              <dt>{t.document.meta.created}</dt>
              <dd className="tabular">{formatShortDate(record.createdAt)}</dd>
            </div>
            {record.updatedAt === record.createdAt ? null : (
              <div className={styles.metaRow}>
                <dt>{t.document.meta.updated}</dt>
                <dd className="tabular">{formatShortDate(record.updatedAt)}</dd>
              </div>
            )}
            <div className={styles.metaRow}>
              <dt>{t.document.meta.author}</dt>
              <dd>{record.authorName}</dd>
            </div>
            <div className={styles.metaRow}>
              <dt>{t.document.meta.company}</dt>
              <dd>{sheetCompany.name}</dd>
            </div>
          </dl>

          {record.description === '' ? null : (
            <div className={styles.description}>
              <div className={styles.descriptionTitle}>{t.document.meta.description}</div>
              <p className={styles.descriptionBody}>{record.description}</p>
            </div>
          )}

          {requisitesFrozen ? (
            <div className={styles.snapshot}>
              <div className={styles.descriptionTitle}>{t.document.snapshotTitle}</div>
              <p className={styles.descriptionBody}>{t.document.snapshotBody}</p>
            </div>
          ) : null}

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
                company={sheetCompany}
                date={record.createdAt}
                number={record.number}
                draft={isDraft}
              />
            </SheetViewport>
          </div>
        </div>
      </div>
    </div>
  );
}
