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

import { PageHeader } from '@/components/PageHeader/PageHeader';
import { StatusStamp } from '@/components/StatusStamp/StatusStamp';
import { t } from '@/i18n';
import { useSession } from '@/store/session';
import { cx } from '@/utils/cx';
import { formatShortDate } from '@/utils/format';

import styles from './DocumentListPage.module.css';

import type { DocumentRecord, DocumentStatus } from '@/api/types';

type Column = 'number' | 'status' | 'author' | 'created';
type Direction = 'asc' | 'desc';

const COLUMNS: Column[] = ['number', 'status', 'author', 'created'];

/** Порядок состояний — по ходу жизни документа, а не по алфавиту. */
const STATUS_ORDER: Record<DocumentStatus, number> = {
  draft: 0,
  review: 1,
  approved: 2,
  rejected: 3,
  archived: 4,
};

/**
 * Номера вводятся вручную и выглядят как «12-К/2026» или «7». Сравнение
 * учитывает числа внутри строки, иначе «10» окажется раньше «2».
 */
const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });

export default function DocumentListPage() {
  const { documents } = useSession();
  const [params, setParams] = useSearchParams();

  const sortBy = parseColumn(params.get('sort'));
  const direction: Direction = params.get('dir') === 'asc' ? 'asc' : 'desc';

  const sorted = useMemo(
    () => sortDocuments(documents, sortBy, direction),
    [documents, sortBy, direction],
  );

  function toggleSort(column: Column) {
    const next: Direction = sortBy === column && direction === 'asc' ? 'desc' : 'asc';
    params.set('sort', column);
    params.set('dir', next);
    setParams(params, { replace: true });
  }

  return (
    <div className={styles.page}>
      <PageHeader title={t.registry.title} subtitle={t.registry.subtitle} />

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
              <span className="tabular">{documents.length}</span> {t.registry.count}
            </div>

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
                          {doc.title}
                        </Link>
                      </td>

                      <td className={styles.colDescription}>
                        {doc.description === '' ? (
                          <span className={styles.muted}>{t.registry.noDescription}</span>
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
