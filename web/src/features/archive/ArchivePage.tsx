/**
 * Архив.
 *
 * Одно место для всех выпущенных бумаг компании («Тест день 2»): документы,
 * сохранённые в системе, и старые документы, которые принесли файлом PDF.
 * Черновиков здесь нет – они ещё не выпущены и живут в реестре.
 *
 * Что человек видит, решает политика: список сохранённых документов – тот
 * же, что в реестре, файлы – по `visibleArchive`. Экран ничего не фильтрует
 * по ролям сам.
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  canDeleteArchiveFile,
  canDeleteDocument,
  canUploadArchive,
  canUseSection,
  sectionOfDocument,
} from '@/access/policy';
import { sections } from '@/api/mock/sections';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { today } from '@/features/document-form/validation';
import { searchDocuments } from '@/features/documents/search';
import { t } from '@/i18n';
import { companyName } from '@/i18n/company';
import { documentTitle, tc } from '@/i18n/content';
import { documentSubject, personName } from '@/i18n/person';
import { useSession } from '@/store/session';
import { cx } from '@/utils/cx';
import { formatShortDate } from '@/utils/format';
import { matchesQuery } from '@/utils/search';

import styles from './ArchivePage.module.css';
import { downloadRegistry } from './exportRegistry';

import type { ArchiveFile, DocumentRecord } from '@/api/types';
import type { ArchiveUploadResult } from '@/store/session';

type Filter = 'all' | 'created' | 'uploaded';

type Row =
  | { kind: 'document'; date: string; doc: DocumentRecord }
  | { kind: 'file'; date: string; file: ArchiveFile };

function sectionTitle(id: string | undefined): string {
  const section = sections.find((s) => s.id === id);
  return section === undefined ? t.registry.noValue : tc(section.short);
}

export default function ArchivePage() {
  const { documents, archive, user, company, openArchiveFile, deleteArchiveFile, deleteDocument } =
    useSession();
  const [params, setParams] = useSearchParams();
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const subject = { user, companyId: company?.id ?? null };
  const query = params.get('q') ?? '';
  const filter: Filter =
    params.get('show') === 'created' || params.get('show') === 'uploaded'
      ? (params.get('show') as Filter)
      : 'all';

  function setParam(key: string, value: string) {
    if (value === '' || value === 'all') params.delete(key);
    else params.set(key, value);
    setParams(params, { replace: true });
  }

  const saved = documents.filter((doc) => doc.status === 'saved');
  const foundDocs = searchDocuments(saved, query, (doc) => [sectionTitle(sectionOfDocument(doc))]);
  const foundFiles = archive.filter((file) =>
    matchesQuery(query, [
      file.title,
      file.number,
      file.description,
      file.fileName,
      file.uploadedByName,
      formatShortDate(file.documentDate),
      sectionTitle(file.sectionId),
    ]),
  );

  const rows: Row[] = [
    ...(filter === 'uploaded'
      ? []
      : foundDocs.map<Row>((doc) => ({ kind: 'document', date: doc.createdAt, doc }))),
    ...(filter === 'created'
      ? []
      : foundFiles.map<Row>((file) => ({ kind: 'file', date: file.documentDate, file }))),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const uploadSections = sections.filter((s) => canUseSection(user, s.id));
  const empty = saved.length === 0 && archive.length === 0;

  async function open(file: ArchiveFile, download: boolean) {
    setProblem(null);
    const result = await openArchiveFile(file.id);
    if (!result.ok) {
      setProblem(result.reason === 'corrupted' ? t.archive.corrupted : t.archive.missing);
      return;
    }

    const url = URL.createObjectURL(result.blob);
    if (download) {
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName;
      link.click();
    } else {
      window.open(url, '_blank', 'noopener');
    }
    // Ссылку держим минуту: новой вкладке нужно успеть её прочитать.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={t.archive.title}
        subtitle={t.archive.subtitle}
        actions={
          uploadSections.length === 0 ? null : (
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                setNotice(null);
                setUploading(!uploading);
              }}
            >
              {t.archive.upload}
            </button>
          )
        }
      />

      <div className={styles.body}>
        {uploading && company !== null ? (
          <UploadForm
            sectionIds={uploadSections
              .filter((s) => canUploadArchive(subject, company.id, s.id))
              .map((s) => s.id)}
            onCancel={() => setUploading(false)}
            onDone={() => {
              setUploading(false);
              setNotice(t.archive.uploaded);
            }}
          />
        ) : null}

        {notice === null ? null : (
          <p className={styles.ok} role="status">
            {notice}
          </p>
        )}
        {problem === null ? null : (
          <p className={styles.error} role="alert">
            {problem}
          </p>
        )}

        {empty ? (
          <p className={styles.muted}>{t.archive.empty}</p>
        ) : (
          <>
            <div className={styles.toolbar}>
              <div className={styles.filters} role="group" aria-label={t.archive.columns.source}>
                {(['all', 'created', 'uploaded'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    className={cx(styles.chip, filter === value && styles.chipActive)}
                    onClick={() => setParam('show', value)}
                  >
                    {value === 'all'
                      ? t.archive.filterAll
                      : value === 'created'
                        ? t.archive.filterCreated
                        : t.archive.filterUploaded}
                  </button>
                ))}
              </div>

              <div className={styles.toolbarEnd}>
                <input
                  className={styles.search}
                  type="search"
                  value={query}
                  placeholder={t.archive.search}
                  aria-label={t.archive.search}
                  onChange={(e) => setParam('q', e.target.value)}
                />
                <button
                  type="button"
                  className={styles.secondary}
                  title={t.archive.exportHint}
                  disabled={rows.length === 0}
                  onClick={() =>
                    downloadRegistry(
                      rows.map((row) =>
                        row.kind === 'document'
                          ? { ...row, section: sectionTitle(sectionOfDocument(row.doc)) }
                          : { ...row, section: sectionTitle(row.file.sectionId) },
                      ),
                      company === null ? '' : companyName(company),
                      today(),
                    )
                  }
                >
                  {t.archive.export}
                </button>
              </div>
            </div>

            {rows.length === 0 ? (
              <p className={styles.muted}>{t.archive.nothingFound}</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t.archive.columns.number}</th>
                      <th>{t.archive.columns.title}</th>
                      <th>{t.archive.columns.date}</th>
                      <th>{t.archive.columns.section}</th>
                      <th>{t.archive.columns.source}</th>
                      <th>{t.archive.columns.who}</th>
                      <th aria-label={t.archive.open} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) =>
                      row.kind === 'document' ? (
                        <tr key={row.doc.id}>
                          <td className={cx(styles.number, 'tabular')}>
                            {row.doc.number ?? t.registry.noNumber}
                          </td>
                          <td>
                            <Link className={styles.link} to={`/documents/${row.doc.id}`}>
                              {documentTitle(row.doc)}
                            </Link>
                            {row.doc.subject === '' ? null : (
                              <div className={styles.sub}>{documentSubject(row.doc)}</div>
                            )}
                          </td>
                          <td className="tabular">{formatShortDate(row.doc.createdAt)}</td>
                          <td>{sectionTitle(sectionOfDocument(row.doc))}</td>
                          <td>
                            <span className={styles.source}>{t.archive.sourceCreated}</span>
                          </td>
                          <td className={styles.sub}>{personName(row.doc.authorName)}</td>
                          <td>
                            <div className={styles.actions}>
                              <Link className={styles.action} to={`/documents/${row.doc.id}`}>
                                {t.archive.open}
                              </Link>
                              {/* Удаление – в корзину админ-панели, как из реестра
                                  («Тест день 3»: «в архиве не могу удалить документ»). */}
                              {canDeleteDocument(subject, row.doc) ? (
                                <button
                                  type="button"
                                  className={styles.danger}
                                  onClick={() => {
                                    if (window.confirm(t.document.deleteConfirm)) {
                                      deleteDocument(row.doc.id);
                                    }
                                  }}
                                >
                                  {t.common.remove}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.file.id}>
                          <td className={cx(styles.number, 'tabular')}>
                            {row.file.number ?? t.registry.noNumber}
                          </td>
                          <td>
                            {row.file.title}
                            {row.file.description === '' ? null : (
                              <div className={styles.sub}>{row.file.description}</div>
                            )}
                          </td>
                          <td className="tabular">{formatShortDate(row.file.documentDate)}</td>
                          <td>{sectionTitle(row.file.sectionId)}</td>
                          <td>
                            <span className={cx(styles.source, styles.sourcePdf)}>
                              {t.archive.sourceUploaded}
                            </span>
                          </td>
                          <td className={styles.sub}>{personName(row.file.uploadedByName)}</td>
                          <td>
                            <div className={styles.actions}>
                              <button
                                type="button"
                                className={styles.action}
                                onClick={() => void open(row.file, false)}
                              >
                                {t.archive.open}
                              </button>
                              <button
                                type="button"
                                className={styles.action}
                                onClick={() => void open(row.file, true)}
                              >
                                {t.archive.download}
                              </button>
                              {canDeleteArchiveFile(subject, row.file) ? (
                                <button
                                  type="button"
                                  className={styles.danger}
                                  onClick={() => {
                                    if (window.confirm(t.archive.deleteConfirm)) {
                                      deleteArchiveFile(row.file.id);
                                    }
                                  }}
                                >
                                  {t.common.remove}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const UPLOAD_ERRORS: Record<Exclude<ArchiveUploadResult, 'ok'>, () => string> = {
  denied: () => t.archive.denied,
  'not-pdf': () => t.archive.notPdf,
  'too-big': () => t.archive.tooBig,
  duplicate: () => t.archive.duplicate,
  'storage-failed': () => t.archive.storageFailed,
};

function UploadForm({
  sectionIds,
  onDone,
  onCancel,
}: {
  sectionIds: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const { uploadArchiveFile } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [sectionId, setSectionId] = useState(sectionIds.length === 1 ? (sectionIds[0] ?? '') : '');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (file === null || title.trim() === '' || documentDate === '' || sectionId === '') {
      setError(t.archive.required);
      return;
    }
    if (documentDate > today()) {
      setError(t.archive.dateInFuture);
      return;
    }

    setBusy(true);
    const result = await uploadArchiveFile({
      file,
      title,
      number,
      documentDate,
      sectionId,
      description,
    });
    setBusy(false);

    if (result === 'ok') onDone();
    else setError(UPLOAD_ERRORS[result]());
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className={styles.formTitle}>{t.archive.uploadTitle}</div>
      <p className={styles.hint}>{t.archive.uploadBody}</p>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.label}>{t.archive.file}</span>
          <input
            className={styles.input}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              const chosen = e.target.files?.[0] ?? null;
              setFile(chosen);
              // Название подсказывается именем файла, но остаётся правкой.
              if (chosen !== null && title.trim() === '') {
                setTitle(chosen.name.replace(/\.pdf$/iu, ''));
              }
            }}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t.archive.docTitle}</span>
          <input
            className={styles.input}
            value={title}
            placeholder={t.archive.docTitleHint}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t.archive.number}</span>
          <input
            className={cx(styles.input, 'tabular')}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t.archive.date}</span>
          <input
            className={styles.input}
            type="date"
            max={today()}
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t.archive.section}</span>
          <select
            className={styles.input}
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
          >
            <option value="">{t.form.selectOption}</option>
            {sections
              .filter((s) => sectionIds.includes(s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {tc(s.title)}
                </option>
              ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t.archive.description}</span>
          <input
            className={styles.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>

      {error === null ? null : (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.formActions}>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          {t.common.cancel}
        </button>
        <button type="submit" className={styles.primary} disabled={busy}>
          {busy ? t.archive.uploading : t.archive.submit}
        </button>
      </div>
    </form>
  );
}
