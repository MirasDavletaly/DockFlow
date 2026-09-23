/**
 * Мои документы — реестр.
 *
 * Свёрстан как разлинованный журнал регистрации: тонкие линейки, моноширинные
 * номера и даты в столбик. Так глаз проверяет строку за строкой, а не бродит
 * по карточкам.
 *
 * Сортировка живёт в адресе страницы, а не только в памяти: отсортированный
 * реестр — это то, что показывают проверяющему и пересылают коллеге, и ссылка
 * должна открываться в том же виде.
 */
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { can, canDeleteDocument } from '@/access/policy';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { StatusStamp } from '@/components/StatusStamp/StatusStamp';
import { t } from '@/i18n';
import { tc } from '@/i18n/content';
import { useSession } from '@/store/session';
import { cx } from '@/utils/cx';
import { formatShortDate } from '@/utils/format';

import { searchDocuments } from './search';

import styles from './DocumentListPage.module.css';

import type { DocumentRecord, DocumentStatus } from '@/api/types';

type Column = 'number' | 'subject' | 'status' | 'author' | 'created';
type Direction = 'asc' | 'desc';

const COLUMNS: Column[] = ['number', 'subject', 'status', 'author', 'created'];

/** Порядок состояний — по ходу жизни документа, а не по алфавиту. */
const STATUS_ORDER: Record<DocumentStatus, number> = {
  draft: 0,
  saved: 1,
};

/**
 * Номера вводятся вручную и выглядят как «12-К/2026» или «7». Сравнение
 * учитывает числа внутри строки, иначе «10» окажется раньше «2».
 */
const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });

export default function DocumentListPage() {
  const { documents, user, company, deleteDocument } = useSession();
  const [params, setParams] = useSearchParams();

  // Что человек тут видит, решает политика: работник — только свои, директор
  // и администратор — все документы компании. Список приходит из сессии уже
  // отфильтрованным, здесь только подпись под заголовком.
  const subject = { user, companyId: company?.id ?? null };
  const seesAll = can(subject, 'documents.viewAll');

  const sortBy = parseColumn(params.get('sort'));
  const direction: Direction = params.get('dir') === 'asc' ? 'asc' : 'desc';
  // Запрос живёт в адресе, как и сортировка: найденный список можно
  // переслать ссылкой, и «назад» из документа возвращает к нему же.
  const query = params.get('q') ?? '';

  const sorted = useMemo(
    () => sortDocuments(searchDocuments(documents, query), sortBy, direction),
    [documents, query, sortBy, direction],
  );

  function setQuery(next: string) {
    if (next === '') params.delete('q');
    else params.set('q', next);
    setParams(params, { replace: true });
  }

  function toggleSort(column: Column) {
    const next: Direction = sortBy === column && direction === 'asc' ? 'desc' : 'asc';
    params.set('sort', column);
    params.set('dir', next);
    setParams(params, { replace: true });
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={seesAll ? t.registry.titleAll : t.registry.title}
        subtitle={seesAll ? t.registry.subtitleAll : t.registry.subtitleOwn}
        actions={
          documents.length === 0 ? null : (
            <input
              className={styles.search}
              type="search"
              value={query}
              placeholder={t.registry.search}
              title={t.registry.searchHint}
              aria-label={t.registry.search}
              onChange={(e) => setQuery(e.target.value)}
            />
          )
        }
      />

      <div className={styles.body}>
        {documents.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyBody}>{t.dashboard.recentEmpty}</p>
            <Link className={styles.emptyAction} to="/create">
              {t.nav.create}
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.count}>
              <span className="tabular">{sorted.length}</span> {t.registry.count}
            </div>

            {sorted.length === 0 ? (
              <p className={styles.emptyBody}>{t.registry.nothingFound}</p>
            ) : null}

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.colNumber} aria-sort={ariaSort(sortBy, 'number', direction)}>
                      <SortButton
                        column="number"
                        active={sortBy === 'number'}
                        direction={direction}
                        onClick={toggleSort}
                      />
                    </th>
                    <th className={styles.colTitle}>{t.registry.columns.title}</th>
                    <th className={styles.colSubject} aria-sort={ariaSort(sortBy, 'subject', direction)}>
                      <SortButton
                        column="subject"
                        active={sortBy === 'subject'}
                        direction={direction}
                        onClick={toggleSort}
                      />
                    </th>
                    <th className={styles.colDescription}>{t.registry.columns.description}</th>
                    <th className={styles.colStatus} aria-sort={ariaSort(sortBy, 'status', direction)}>
                      <SortButton
                        column="status"
                        active={sortBy === 'status'}
                        direction={direction}
                        onClick={toggleSort}
                      />
                    </th>
                    <th className={styles.colAuthor} aria-sort={ariaSort(sortBy, 'author', direction)}>
                      <SortButton
                        column="author"
                        active={sortBy === 'author'}
                        direction={direction}
                        onClick={toggleSort}
                      />
                    </th>
                    <th className={styles.colDate} aria-sort={ariaSort(sortBy, 'created', direction)}>
                      <SortButton
                        column="created"
                        active={sortBy === 'created'}
                        direction={direction}
                        onClick={toggleSort}
                      />
                    </th>
                    <th className={styles.colActions} aria-label={t.common.remove} />
                  </tr>
                </thead>

                <tbody>
                  {sorted.map((doc) => (
                    <tr key={doc.id}>
                      <td className={cx(styles.colNumber, 'tabular')}>
                        {doc.number === null ? (
                          <span className={styles.noNumber} title={t.registry.noNumberHint}>
                            {t.registry.noNumber}
                          </span>
                        ) : (
                          <span className={styles.number}>{doc.number}</span>
                        )}
                      </td>

                      <td className={styles.colTitle}>
                        <Link className={styles.link} to={`/documents/${doc.id}`}>
                          {tc(doc.title)}
                        </Link>
                      </td>

                      <td className={styles.colSubject}>
                        {doc.subject === '' ? (
                          <span className={styles.muted}>{t.registry.noValue}</span>
                        ) : (
                          doc.subject
                        )}
                      </td>

                      <td className={styles.colDescription}>
                        {doc.description === '' ? (
                          <span className={styles.muted}>{t.registry.noValue}</span>
                        ) : (
                          <span className={styles.description} title={doc.description}>
                            {doc.description}
                          </span>
                        )}
                      </td>

                      <td className={styles.colStatus}>
                        <StatusStamp status={doc.status} size="sm" />
                      </td>

                      <td className={styles.colAuthor}>{doc.authorName}</td>

                      <td className={cx(styles.colDate, 'tabular')}>
                        {formatShortDate(doc.createdAt)}
                      </td>

                      <td className={styles.colActions}>
                        {canDeleteDocument(subject, doc) ? (
                          <button
                            type="button"
                            className={styles.delete}
                            onClick={() => {
                              if (window.confirm(t.document.deleteConfirm)) deleteDocument(doc.id);
                            }}
                          >
                            {t.common.remove}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface SortButtonProps {
  column: Column;
  active: boolean;
  direction: Direction;
  onClick: (column: Column) => void;
}

function SortButton({ column, active, direction, onClick }: SortButtonProps) {
  const label = t.registry.columns[column];

  return (
    <button
      type="button"
      className={cx(styles.sortButton, active && styles.sortButtonActive)}
      onClick={() => onClick(column)}
      title={active ? (direction === 'asc' ? t.registry.sortAsc : t.registry.sortDesc) : undefined}
    >
      {label}
      <span className={styles.sortMark} aria-hidden="true">
        {active ? (direction === 'asc' ? '▲' : '▼') : '·'}
      </span>
    </button>
  );
}

function parseColumn(raw: string | null): Column {
  return COLUMNS.find((c) => c === raw) ?? 'created';
}

function ariaSort(
  sortBy: Column,
  column: Column,
  direction: Direction,
): 'ascending' | 'descending' | 'none' {
  if (sortBy !== column) return 'none';
  return direction === 'asc' ? 'ascending' : 'descending';
}

function sortDocuments(
  documents: DocumentRecord[],
  column: Column,
  direction: Direction,
): DocumentRecord[] {
  const sign = direction === 'asc' ? 1 : -1;

  return [...documents].sort((a, b) => {
    switch (column) {
      case 'number': {
        // Документы без номера всегда внизу, в обе стороны сортировки:
        // они ещё не попали в реестр, и перемешивать их с пронумерованными
        // значило бы прятать номерной ряд, ради которого реестр и открывают.
        if (a.number === null && b.number === null) return byDate(a, b);
        if (a.number === null) return 1;
        if (b.number === null) return -1;
        return sign * collator.compare(a.number, b.number);
      }

      case 'subject':
        return sign * a.subject.localeCompare(b.subject, 'ru');

      case 'status':
        return sign * (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

      case 'author':
        return sign * a.authorName.localeCompare(b.authorName, 'ru');

      case 'created':
      default:
        return sign * -byDate(a, b);
    }
  });
}

/** Свежие документы первыми. */
function byDate(a: DocumentRecord, b: DocumentRecord): number {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}
